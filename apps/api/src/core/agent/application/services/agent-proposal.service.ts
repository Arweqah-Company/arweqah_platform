import { Injectable } from '@nestjs/common';
import { SecuritySettingsService } from '../../../auth/application/security-settings.service';
import { AgentRepository } from '../../domain/contracts/agent.repository';
import type { AgentMessage } from '../../domain/entities/agent.entities';
import { fileCapOf, withoutFileIds } from '../../domain/rules/agent-image.rules';
import { fieldBrief, missingRequired } from '../../domain/rules/agent-catalog.rules';
import { expiryOf, parseValues, splitByPlace, ungroundedIds, type AgentStep } from '../../domain/rules/agent-turn.rules';
import type { AgentAction } from '../../domain/types/agent-catalog.types';
import { AgentCatalogService } from './agent-catalog.service';

/** A draft, or a note for the model; when the only thing wrong is mandatory fields still empty, `incomplete` says which action and what was understood, so the chat can offer the form. */
export type ProposalOutcome = { message: AgentMessage } | { note: string; incomplete?: { action: AgentAction; values: Record<string, unknown> } };

/**
 * Turns what the model proposed into a draft only when it can run: a "write" action of the person's list, an object of values, no field of a stranger,
 * every mandatory field present, every id one the conversation looked up (FR-139, FR-140), and the route's own zod schemas pass.
 * Otherwise it answers with a note the model reads, so the model asks the employee or fixes it.
 */
@Injectable()
export class AgentProposalService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly catalog: AgentCatalogService,
    private readonly settings: SecuritySettingsService,
  ) {}

  async propose(conversationId: string, action: AgentAction | undefined, turn: AgentStep, lookedUp: readonly string[]): Promise<ProposalOutcome> {
    const written = parseValues(turn.valuesJson);
    // The platform sets `fileIds` itself from the pictures the employee sent; what the model wrote there is dropped.
    const values = written && withoutFileIds(written);
    const problem = this.problemWith(action, values, lookedUp);
    if (problem || !action || !values) return this.refusal(problem, action, values);
    const checked = this.catalog.validate(action.operationId, splitByPlace(action.fields, values));
    if (!checked.ok) return { note: `The fields are not valid: ${checked.issues.join('; ')}` };
    return { message: await this.createDraft(conversationId, action, values, turn.summary.trim() || action.labelEn) };
  }

  /** The note for the model; when only mandatory fields are missing, also what the chat needs to offer the form. */
  private refusal(problem: { text: string; missing?: boolean } | null, action: AgentAction | undefined, values: Record<string, unknown> | null): ProposalOutcome {
    const note = problem?.text ?? 'Nothing to propose.';
    return problem?.missing && action && values ? { note, incomplete: { action, values } } : { note };
  }

  /** Saves the draft that waits for the employee's confirmation, and cancels any older one in the conversation. */
  private async createDraft(conversationId: string, action: AgentAction, values: Record<string, unknown>, summary: string): Promise<AgentMessage> {
    const split = splitByPlace(action.fields, values);
    const cap = fileCapOf(action.fields);
    const files = cap ? await this.repo.conversationImages(conversationId, cap) : [];
    return this.repo.replacePendingDraft({
      conversationId,
      role: 'assistant',
      text: summary,
      draftExpiresAt: expiryOf(new Date(), await this.settings.get('agentDraftMinutes')),
      draft: { operationId: action.operationId, labelAr: action.labelAr, labelEn: action.labelEn, summary, values, input: { path: split.path, query: split.query, body: split.body }, destructive: action.httpMethod === 'DELETE', files },
    });
  }

  /** What is wrong with the proposal before the route's schemas look at it, in words for the model; null when nothing. */
  private problemWith(action: AgentAction | undefined, values: Record<string, unknown> | null, lookedUp: readonly string[]): { text: string; missing?: boolean } | null {
    if (!action || action.kind !== 'write') return { text: 'That is not a "write" action of the list.' };
    if (!values) return { text: 'valuesJson must be a JSON object.' };
    const unknown = splitByPlace(action.fields, values).unknown;
    if (unknown.length) return { text: `These fields do not exist on the action: ${unknown.join(', ')}.` };
    const missing = missingRequired(action.fields, values);
    if (missing.length) return { text: `Mandatory fields still missing. Ask the employee for ALL of them in ONE message, as a numbered list, and tell them the form button under your message opens a form with all the fields (for every missing field whose value is chosen from existing data, look the choices up with find first and give them in optionsJson of your say): ${missing.map(fieldBrief).join('; ')}.`, missing: true };
    const invented = ungroundedIds(values, lookedUp);
    return invented.length ? { text: `These ids were not shown by any lookup, never invent an id: ${invented.join(', ')}.` } : null;
  }
}
