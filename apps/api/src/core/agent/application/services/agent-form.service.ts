import { Injectable } from '@nestjs/common';
import type { AgentFormSubmitInput, AgentReplyDto } from '@arweqah-platform/shared';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../access/domain/access-context';
import { AgentRepository } from '../../domain/contracts/agent.repository';
import type { AgentMessage, StoredForm } from '../../domain/entities/agent.entities';
import { AgentDraftNotFoundError, AgentDraftNotPendingError, AgentFormInvalidError } from '../../domain/errors/agent.errors';
import { buildForm, cleanValues, formErrors, formSummary, pairedInData } from '../../domain/rules/agent-form.rules';
import { splitByPlace, type AgentStep, type ChoiceOption } from '../../domain/rules/agent-turn.rules';
import type { AgentAction } from '../../domain/types/agent-catalog.types';
import { toMessageDto } from '../transformers/agent.transformer';
import { AgentAvailability } from './agent-availability';
import { AgentCatalogService } from './agent-catalog.service';
import { AgentProposalService } from './agent-proposal.service';

/** What the chat knows when it offers a form: the action, what was understood, the model's choices and names, and the data the lookups showed. */
export interface FormOffer {
  action: AgentAction;
  values: Record<string, unknown>;
  options: Record<string, ChoiceOption[]>;
  labels: Record<string, string>;
  lookedUp: readonly string[];
}

/** Sending a form: who, which message, what they typed, and their language (the card is worded in it). */
export interface FormSubmit {
  ctx: AccessContext;
  userId: string;
  id: string;
  input: AgentFormSubmitInput;
  locale: 'ar' | 'en';
}

/**
 * The form in the chat (FR-152): built from the action's own schema, with the choices the model found checked against the lookup data, and sent once.
 * Sending it makes the same confirmation card as a proposal; nothing runs until the employee confirms that.
 */
@Injectable()
export class AgentFormService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly catalog: AgentCatalogService,
    private readonly proposals: AgentProposalService,
    private readonly availability: AgentAvailability,
  ) {}

  /** The form to attach to the assistant's message, or null when the action cannot be drawn as one. A choice the lookups do not show is dropped. */
  offer(input: FormOffer): StoredForm | null {
    const options = Object.fromEntries(Object.entries(input.options).map(([field, list]) => [field, list.filter((o) => pairedInData(o, input.lookedUp))]));
    const built = buildForm({ action: input.action, values: input.values, options, labels: input.labels });
    return built && { operationId: input.action.operationId, labelAr: input.action.labelAr, labelEn: input.action.labelEn, ...built };
  }

  async submit({ ctx, userId, id, input, locale }: FormSubmit): Promise<AgentReplyDto> {
    await this.availability.assertOn();
    const message = await this.openForm(userId, id);
    const form = message.form!;
    const action = this.catalog.find(form.operationId);
    if (!action || !ctx.has(action.permission)) throw new ForbiddenError();
    const values = cleanValues(form.fields, form.values, input.values);
    this.assertValid(form, action, values);
    if (!(await this.repo.moveForm(message.id, 'open', 'submitted'))) throw new AgentDraftNotPendingError();
    const draft = await this.proposals.propose(message.conversationId, action, this.stepOf(form, values, locale), [JSON.stringify(form.fields.flatMap((f) => f.options ?? []))]);
    if (!('message' in draft)) {
      await this.repo.moveForm(message.id, 'submitted', 'open');
      throw new AgentFormInvalidError({ _form: draft.note });
    }
    await this.repo.touchConversation(message.conversationId);
    const sent = (await this.repo.findMessage(message.id, userId))!;
    return { conversationId: message.conversationId, messages: [toMessageDto(sent), toMessageDto(draft.message)] };
  }

  private async openForm(userId: string, id: string): Promise<AgentMessage> {
    const message = await this.repo.findMessage(id, userId);
    if (!message?.form) throw new AgentDraftNotFoundError();
    if (message.formStatus !== 'open') throw new AgentDraftNotPendingError();
    return message;
  }

  /** The form's own rules, then the route's zod schemas, field by field. */
  private assertValid(form: StoredForm, action: AgentAction, values: Record<string, unknown>): void {
    const errors = formErrors(form.fields, values);
    if (Object.keys(errors).length > 0) throw new AgentFormInvalidError(errors);
    const checked = this.catalog.validate(action.operationId, splitByPlace(action.fields, values));
    if (checked.ok) return;
    throw new AgentFormInvalidError(Object.fromEntries(checked.issues.map((issue) => [issue.split(':')[0]?.split('.')[1] ?? '_form', issue.split(':').slice(1).join(':').trim()])));
  }

  private stepOf(form: StoredForm, values: Record<string, unknown>, locale: 'ar' | 'en'): AgentStep {
    return { kind: 'propose', text: '', operationId: form.operationId, valuesJson: JSON.stringify(values), summary: formSummary(locale === 'ar' ? form.labelAr : form.labelEn, form.fields, values), linksJson: '[]', optionsJson: '{}', labelsJson: '{}' };
  }
}
