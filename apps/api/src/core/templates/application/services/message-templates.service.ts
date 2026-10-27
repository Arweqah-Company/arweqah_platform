import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PreviewTemplateInput, SaveTemplateInput, TemplateCatalogDto, TemplateContent, TemplateDto, TemplateKind, TemplatePreviewDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../audit/application/audit.events';
import { MessageTemplateRepository } from '../../domain/contracts/message-template.repository';
import type { MessageTemplate } from '../../domain/entities/message-template.entity';
import { TemplateInvalidContentError, TemplateMissingVariableError, TemplateNothingPendingError, TemplateSelfApprovalError, TemplateUnknownVariableError } from '../../domain/errors/templates.errors';
import { hasMarkup, isSameContent, missingVariables, oneLine, sanitizeEmailBody, unknownVariables } from '../../domain/rules/template-rules';
import type { TemplateDefinition } from '../../domain/types/template.types';
import { AUDIT } from '../messages/templates.messages';
import { toTemplateDto } from '../transformers/template.transformer';
import { TemplateRegistry } from './template-registry';
import { TemplateRenderer } from './template-renderer';

/**
 * The dashboard's side of message templates: list them, change the wording, reset it, and (when switched on in the settings)
 * hold a change until a different person approves it. What is sent is read through `TemplateRenderer`.
 */
@Injectable()
export class MessageTemplatesService {
  constructor(
    private readonly registry: TemplateRegistry,
    private readonly repo: MessageTemplateRepository,
    private readonly renderer: TemplateRenderer,
    private readonly events: EventEmitter2,
  ) {}

  async catalog(kind: TemplateKind): Promise<TemplateCatalogDto> {
    const rows = await this.repo.findAll(kind);
    const names = await this.repo.namesOf(rows.flatMap((r) => (r.pendingBy ? [r.pendingBy] : [])));
    const templates = this.registry.all(kind).map((def) => this.describe(def, rows.find((r) => r.key === def.key) ?? null, names));
    return { kind, requireApproval: await this.repo.requireApproval(kind), templates };
  }

  /** Saves the wording: live at once, or as a pending change when approval is switched on. */
  async save(kind: TemplateKind, key: string, input: SaveTemplateInput, actorId: string): Promise<TemplateDto> {
    const def = this.definition(kind, key);
    const content = this.checked(def, input.content);
    const needsApproval = await this.repo.requireApproval(kind);
    const row = needsApproval
      ? await this.repo.save({ kind, key, pending: content, pendingBy: actorId, pendingAt: new Date(), updatedBy: actorId })
      : await this.repo.save({ kind, key, content, pending: null, pendingBy: null, pendingAt: null, updatedBy: actorId });
    this.renderer.invalidate();
    this.audit({ actorId, action: needsApproval ? AUDIT.submitted : AUDIT.saved, key, kind });
    return this.describe(def, row, await this.repo.namesOf(row.pendingBy ? [row.pendingBy] : []));
  }

  async approve(kind: TemplateKind, key: string, actorId: string): Promise<TemplateDto> {
    const def = this.definition(kind, key);
    const row = await this.pendingRow(kind, key);
    if (row.pendingBy === actorId) throw new TemplateSelfApprovalError();
    // A change that goes back to the default wording is stored as «no customisation», like a reset.
    const pending = row.pending as TemplateContent;
    const content = isSameContent(pending, def.defaults) ? null : pending;
    const saved = await this.repo.save({ kind, key, content, pending: null, pendingBy: null, pendingAt: null, updatedBy: actorId });
    this.renderer.invalidate();
    this.audit({ actorId, action: AUDIT.approved, key, kind });
    return this.describe(def, saved, new Map());
  }

  async reject(kind: TemplateKind, key: string, note: string, actorId: string): Promise<TemplateDto> {
    const def = this.definition(kind, key);
    await this.pendingRow(kind, key);
    const saved = await this.repo.save({ kind, key, pending: null, pendingBy: null, pendingAt: null, updatedBy: actorId });
    this.audit({ actorId, action: AUDIT.rejected, key, kind, changes: { hasNote: note.length > 0 } });
    return this.describe(def, saved, new Map());
  }

  /**
   * Back to the wording in the code. Live at once, or, when approval is on, a pending change to the default wording: going back
   * changes what is sent, so it needs the same second person as any other change (and it would also drop a colleague's pending change).
   */
  async reset(kind: TemplateKind, key: string, actorId: string): Promise<TemplateDto> {
    const def = this.definition(kind, key);
    if (await this.repo.requireApproval(kind)) {
      const row = await this.repo.save({ kind, key, pending: def.defaults, pendingBy: actorId, pendingAt: new Date(), updatedBy: actorId });
      this.audit({ actorId, action: AUDIT.submitted, key, kind, changes: { reset: true } });
      return this.describe(def, row, await this.repo.namesOf([actorId]));
    }
    await this.repo.remove(kind, key);
    this.renderer.invalidate();
    this.audit({ actorId, action: AUDIT.reset, key, kind });
    return this.describe(def, null, new Map());
  }

  async setRequireApproval(kind: TemplateKind, requireApproval: boolean, actorId: string): Promise<TemplateCatalogDto> {
    await this.repo.setRequireApproval(kind, requireApproval, actorId);
    this.audit({ actorId, action: AUDIT.settingsChanged, key: kind, kind, changes: { requireApproval } });
    return this.catalog(kind);
  }

  preview(kind: TemplateKind, key: string, input: PreviewTemplateInput): TemplatePreviewDto {
    const def = this.definition(kind, key);
    return this.renderer.preview(def, this.checked(def, input.content), input.lang);
  }

  /** The same checks a save makes, so a preview and a test show exactly what a save would keep. */
  checked(def: TemplateDefinition, content: TemplateContent): TemplateContent {
    const unknown = unknownVariables(def, content);
    if (unknown.length) throw new TemplateUnknownVariableError(unknown);
    const missing = missingVariables(def, content);
    if (missing.length) throw new TemplateMissingVariableError(missing);
    if (hasMarkup(def.kind, content)) throw new TemplateInvalidContentError('notifications are plain text');
    const clean = (part: TemplateContent['ar']) => ({ ...part, title: oneLine(part.title), preheader: oneLine(part.preheader), buttonText: oneLine(part.buttonText) });
    if (def.kind === 'notification') return { ar: clean(content.ar), en: clean(content.en) };
    return { ...content, ar: { ...clean(content.ar), body: sanitizeEmailBody(content.ar.body) }, en: { ...clean(content.en), body: sanitizeEmailBody(content.en.body) } };
  }

  definition(kind: TemplateKind, key: string): TemplateDefinition {
    const def = this.registry.get(kind, key);
    if (!def) throw new NotFoundError('Template', key);
    return def;
  }

  private async pendingRow(kind: TemplateKind, key: string): Promise<MessageTemplate> {
    const row = await this.repo.find(kind, key);
    if (!row?.pending) throw new TemplateNothingPendingError();
    return row;
  }

  private describe(def: TemplateDefinition, row: MessageTemplate | null, names: Map<string, string>): TemplateDto {
    return toTemplateDto({ def, row, submitterName: (row?.pendingBy && names.get(row.pendingBy)) || '' });
  }

  private audit({ actorId, action, key, kind, changes = {} }: { actorId: string; action: string; key: string; kind: TemplateKind; changes?: Record<string, unknown> }): void {
    const event: AuditEvent = { actorId, action, entityType: 'message_template', entityId: key, changes: { kind, ...changes } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
