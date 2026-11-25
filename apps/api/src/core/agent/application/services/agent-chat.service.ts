import { Injectable } from '@nestjs/common';
import type { AgentMessageInput, AgentReplyDto } from '@arweqah-platform/shared';
import { RateWindow } from '../../../../common/application/rate-window';
import { PageVisibilityService } from '../../../access/application/page-visibility.service';
import type { AccessContext } from '../../../access/domain/access-context';
import { SecuritySettingsService } from '../../../auth/application/security-settings.service';
import type { AiImage } from '../../../integrations/domain/contracts/ai-client';
import { AiService } from '../../../integrations/application/services/ai.service';
import { AiNotConfiguredError, AiUnavailableError } from '../../../integrations/domain/errors/integrations.errors';
import { AgentRepository } from '../../domain/contracts/agent.repository';
import type { AgentLinkDto } from '@arweqah-platform/shared';
import type { AgentConversation, AgentMessage, StoredForm } from '../../domain/entities/agent.entities';
import { AgentConversationNotFoundError, AgentRateLimitedError } from '../../domain/errors/agent.errors';
import type { AgentTurnEvents } from '../../domain/types/agent-stream.types';
import { AGENT_HISTORY_MESSAGES, AGENT_MAX_CALLS, AGENT_MAX_STEPS, AGENT_MAX_STEPS_PER_CALL, SayTextExtractor, agentTurnSchema, normalizeTurn, parseLabels, parseLinkIds, parseOptions, titleOf, type AgentStep, type AgentTurn } from '../../domain/rules/agent-turn.rules';
import type { AgentAction } from '../../domain/types/agent-catalog.types';
import { agentText } from '../messages/agent.messages';
import { AGENT_SYSTEM, PICTURES_NOT_SEEN_NOTE, PROPOSE_FIRST_NOTE, describeAction, promptUser, type TranscriptLine } from '../messages/agent.prompt';
import { toMessageDto } from '../transformers/agent.transformer';
import { AgentAvailability } from './agent-availability';
import { AgentCatalogService } from './agent-catalog.service';
import type { AgentRequestContext } from './agent-executor';
import { messageText, latestImages } from '../../domain/rules/agent-image.rules';
import { AgentCheckService } from './agent-check.service';
import { AgentFilesService } from './agent-files.service';
import { AgentFormService } from './agent-form.service';
import { AgentGuideService } from './agent-guide.service';
import { AgentLookupService } from './agent-lookup.service';
import { AgentProposalService } from './agent-proposal.service';

const HOUR_MS = 3_600_000;
const MAX_TOKENS = 1500;

/** One message of an employee: who, what they wrote, the request it came in on, and where a live screen is told what happens (absent for the plain request). */
export interface AgentSend {
  ctx: AccessContext;
  userId: string;
  input: AgentMessageInput;
  request: AgentRequestContext;
  events?: AgentTurnEvents;
}

/** What one message has learned so far: the conversation as the model reads it, and notes from this turn (field lists, failed lookups). */
interface TurnState {
  conversation: AgentConversation;
  actions: AgentAction[];
  lines: TranscriptLine[];
  notes: string[];
  /** Steps run so far this message, of every call: the budget is AGENT_MAX_STEPS. */
  stepsRun: number;
  /** Actions whose fields the model has already been shown this message. */
  described: Set<string>;
  /** The manual sections the search found this message: the only ones a link may point to. */
  guided: Map<string, AgentLinkDto>;
  /** Set when a proposal failed only for mandatory fields still empty: the form the next «say» may carry. */
  formOffer?: { action: AgentAction; values: Record<string, unknown> };
  /** A propose was tried this message (whatever came of it), and the model was already sent back once to try one before answering. */
  proposed?: boolean;
  sentBack?: boolean;
  ctx: AccessContext;
  request: AgentRequestContext;
  /** Where a live screen is told what is happening; absent for the plain request. */
  events?: AgentTurnEvents;
  /** The pictures the model is shown with every call of this message (empty once the service answered that it cannot read them). */
  images: AiImage[];
}

/** What a step did: the message that ends the turn, `next` (go on with the next step), or `failed` (a note for the model; the steps after it are dropped). */
type StepResult = AgentMessage | 'next' | 'failed';

/**
 * One message of an employee to the assistant (FR-138, FR-139): the model answers in small structured steps (say, describe, find, propose) and this service
 * does what each asks, within the employee's own keys, until it has something to say. It never changes data: the most it makes is a draft to confirm.
 */
@Injectable()
export class AgentChatService {
  private readonly window = new RateWindow(30, HOUR_MS);

  constructor(
    private readonly repo: AgentRepository,
    private readonly ai: AiService,
    private readonly catalog: AgentCatalogService,
    private readonly pages: PageVisibilityService,
    private readonly settings: SecuritySettingsService,
    private readonly lookups: AgentLookupService,
    private readonly proposals: AgentProposalService,
    private readonly guides: AgentGuideService,
    private readonly availability: AgentAvailability,
    private readonly checks: AgentCheckService,
    private readonly forms: AgentFormService,
    private readonly pictures: AgentFilesService,
  ) {}

  async send(call: AgentSend): Promise<AgentReplyDto> {
    const { userId } = call;
    await this.availability.assertOn();
    if (!this.window.take(userId, Date.now(), await this.settings.get('agentMessagesPerHour'))) throw new AgentRateLimitedError();
    try {
      return await this.converse(call);
    } catch (error) {
      if (error instanceof AiNotConfiguredError || error instanceof AiUnavailableError) this.window.refund(userId);
      throw error;
    }
  }

  private async converse({ ctx, userId, input, request, events }: AgentSend): Promise<AgentReplyDto> {
    const fileIds = await this.attachedTo(ctx, userId, input);
    const conversation = await this.conversationFor(userId, input, request.locale);
    const saved = await this.repo.addMessage({ conversationId: conversation.id, role: 'user', text: input.text, fileIds });
    // Up to this very message: one sent at the same moment on the same conversation must not appear in this answer's context.
    const history = await this.repo.recentMessages(conversation.id, AGENT_HISTORY_MESSAGES, saved.createdAt);
    const images = await this.pictures.imagesOf(latestImages(history));
    const state: TurnState = { conversation, actions: await this.visibleTo(ctx), lines: history.map(toLine), notes: [], stepsRun: 0, described: new Set(), guided: new Map(), ctx, request, events, images };
    const reply = await this.runSteps(state);
    await this.repo.touchConversation(conversation.id);
    return { conversationId: conversation.id, messages: [toMessageDto(reply)] };
  }

  /** The pictures sent with the message, checked (the key, each one the person's own and still free); none when there are none. */
  private async attachedTo(ctx: AccessContext, userId: string, input: AgentMessageInput): Promise<string[]> {
    if (!input.fileIds.length) return [];
    this.pictures.assertMayAttach(ctx);
    return this.pictures.attachable(userId, input.fileIds);
  }

  private async conversationFor(userId: string, input: AgentMessageInput, locale: 'ar' | 'en'): Promise<AgentConversation> {
    if (!input.conversationId) return this.repo.createConversation(userId, titleOf(input.text) || agentText('pictureTitle', locale));
    const found = await this.repo.findConversation(input.conversationId, userId);
    if (!found) throw new AgentConversationNotFoundError();
    return found;
  }

  /** The actions of the person's keys, minus those of a page hidden from them. */
  private async visibleTo(ctx: AccessContext): Promise<AgentAction[]> {
    const hidden = new Set<string>(await this.pages.hiddenFor(ctx));
    return this.catalog.forContext(ctx).filter((action) => !action.pageKey || !hidden.has(action.pageKey));
  }

  private async runSteps(state: TurnState): Promise<AgentMessage> {
    for (let call = 0; call < AGENT_MAX_CALLS && state.stepsRun < AGENT_MAX_STEPS; call += 1) {
      const answer = await this.runTurn(state, await this.ask(state));
      if (answer) return answer;
    }
    return this.say(state, agentText('gaveUp', state.request.locale));
  }

  private async ask(state: TurnState): Promise<AgentTurn> {
    state.events?.status({ code: 'thinking' });
    const { events } = state;
    const extractor = new SayTextExtractor();
    const onText = events ? (delta: string) => { const fresh = extractor.push(delta); if (fresh) events.text(fresh); } : undefined;
    const user = promptUser(state.actions, state.lines, state.notes);
    const asked = { system: AGENT_SYSTEM, user, schema: agentTurnSchema, maxTokens: MAX_TOKENS, normalize: normalizeTurn, onText };
    if (!state.images.length) return (await this.ai.jsonOf(asked)).value;
    const answer = await this.ai.jsonOf({ ...asked, images: state.images, userWithoutImages: promptUser(state.actions, state.lines, [...state.notes, PICTURES_NOT_SEEN_NOTE]) });
    if (!answer.imagesSeen) {
      // The service reads no pictures: the next calls of this message do not send them again, and the model keeps being told so.
      state.images = [];
      state.notes.push(PICTURES_NOT_SEEN_NOTE);
    }
    return answer.value;
  }

  /** The steps of one model answer, in order, until one ends the turn or fails. */
  private async runTurn(state: TurnState, turn: AgentTurn): Promise<AgentMessage | null> {
    for (const step of turn.steps.slice(0, AGENT_MAX_STEPS_PER_CALL)) {
      if (state.stepsRun >= AGENT_MAX_STEPS) return null;
      state.stepsRun += 1;
      const result = await this.act(state, step);
      if (result === 'failed') return null;
      if (result !== 'next') return result;
    }
    return null;
  }

  private async act(state: TurnState, step: AgentStep): Promise<StepResult> {
    const action = state.actions.find((a) => a.operationId === step.operationId);
    switch (step.kind) {
      case 'say':
        return this.mustProposeFirst(state) ? this.fail(state, PROPOSE_FIRST_NOTE) : this.sayStep(state, step);
      case 'check':
        return this.check(state, step.text);
      case 'describe':
        return this.learn(state, action) ? 'next' : this.fail(state, `Unknown action: ${step.operationId}`);
      case 'guide':
        return this.guide(state, step.text);
      case 'find':
        return this.find(state, action, step);
      default:
        return this.propose(state, action, step);
    }
  }

  /** Shows the model the fields of an action the first time it is named; false when there is no such action in the person's list. */
  private learn(state: TurnState, action: AgentAction | undefined): boolean {
    if (!action) return false;
    if (!state.described.has(action.operationId)) {
      state.described.add(action.operationId);
      state.notes.push(describeAction(action));
    }
    return true;
  }

  /** Tells a live screen which action is being worked on, in the person's language. */
  private working(state: TurnState, code: 'lookup' | 'preparing', action: AgentAction | undefined): void {
    if (action) state.events?.status({ code, label: state.request.locale === 'ar' ? action.labelAr : action.labelEn });
  }

  private fail(state: TurnState, note: string): 'failed' {
    state.notes.push(note);
    return 'failed';
  }

  private async guide(state: TurnState, topic: string): Promise<StepResult> {
    state.events?.status({ code: 'manual' });
    const found = await this.guides.find(state.ctx, topic, state.request.locale);
    for (const section of found?.sections ?? []) state.guided.set(section.id, { sectionId: section.id, title: section.title, page: section.page });
    state.notes.push(found ? `User manual (when you explain where something is, put the ids of the sections you used in linksJson of your say):\n${found.text}` : 'The user manual has nothing on that topic for this employee. Say so.');
    return 'next';
  }

  /** «Do I have permission to …?»: what the platform has that matches, and where this employee stands with each. */
  private async check(state: TurnState, topic: string): Promise<StepResult> {
    state.events?.status({ code: 'permission' });
    const found = await this.checks.find(state.ctx, topic);
    state.notes.push(found ? `Permission check (tell the employee plainly which applies):\n${found}` : 'The platform has nothing like that. Say so.');
    return 'next';
  }

  private async find(state: TurnState, action: AgentAction | undefined, step: AgentStep): Promise<StepResult> {
    this.learn(state, action);
    this.working(state, 'lookup', action);
    const found = await this.lookups.find(state.conversation.id, action, step.valuesJson, state.request);
    if (!('data' in found)) return this.fail(state, found.note);
    state.lines.push({ role: 'tool', text: found.data });
    state.notes.push('Match the employee\'s names to this data by meaning, not by letters; if several are close, ask which one.');
    return 'next';
  }

  /** The model described a «write» action and wants to answer without proposing it: it is sent back once, because only a proposal makes the platform list the missing fields and build the form (a button the model promised would not exist). */
  private mustProposeFirst(state: TurnState): boolean {
    if (state.proposed || state.sentBack) return false;
    const wrote = [...state.described].some((id) => state.actions.find((a) => a.operationId === id)?.kind === 'write');
    state.sentBack = wrote;
    return wrote;
  }

  private async propose(state: TurnState, action: AgentAction | undefined, step: AgentStep): Promise<StepResult> {
    state.proposed = true;
    this.learn(state, action);
    this.working(state, 'preparing', action);
    const proposed = await this.proposals.propose(state.conversation.id, action, step, state.lines.filter((l) => l.role === 'tool').map((l) => l.text));
    if ('message' in proposed) return proposed.message;
    state.formOffer = proposed.incomplete;
    return this.fail(state, proposed.note);
  }

  /** The assistant's words, with the links to the manual sections it used and the form it offers when fields were missing (both checked here, never taken as the model wrote them). */
  private sayStep(state: TurnState, step: AgentStep): Promise<AgentMessage> {
    const links = parseLinkIds(step.linksJson).flatMap((id) => state.guided.get(id) ?? []);
    const form = this.formOf(state, step);
    return this.repo.addMessage({ conversationId: state.conversation.id, role: 'assistant', text: step.text.trim() || agentText('gaveUp', state.request.locale), ...(links.length > 0 && { links }), ...(form && { form }) });
  }

  private formOf(state: TurnState, step: AgentStep): StoredForm | null {
    const { formOffer } = state;
    if (!formOffer) return null;
    return this.forms.offer({ ...formOffer, options: parseOptions(step.optionsJson), labels: parseLabels(step.labelsJson), lookedUp: state.lines.filter((l) => l.role === 'tool').map((l) => l.text), locale: state.request.locale });
  }

  private say(state: TurnState, text: string): Promise<AgentMessage> {
    return this.repo.addMessage({ conversationId: state.conversation.id, role: 'assistant', text });
  }
}

function toLine(message: AgentMessage): TranscriptLine {
  const text = message.role === 'user' ? messageText(message.text, message.files.length) : message.text;
  return { role: message.role === 'user' || message.role === 'tool' ? message.role : 'assistant', text };
}
