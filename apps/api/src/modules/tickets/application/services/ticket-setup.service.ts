import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, DESK_DEFAULTS, type PersonRefDto, type TicketDeskDto, type TicketDeskSettingsInput, type TicketTypeDto, type TicketTypeInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TicketDeskRepository } from '../../domain/contracts/ticket-desk.repository';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { AssigneeInvalidError, DeskNoManagerError, DeskNotFoundError, TypeNoHandlerError, TypePersonalOneHandlerError } from '../../domain/errors/ticket.errors';
import type { DeskRecord, DeskSettingsValues, DepartmentFacts, TypeRecord, TypeValues } from '../../domain/types/ticket.types';
import { sanitizeInstructions } from '../../domain/rules/ticket-instructions.rules';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { departmentsFor } from '../policies/department-scope';
import { TicketTransformer } from '../transformers/ticket.transformer';
import { TicketNotifier } from './ticket-notifier.service';

/** A department nobody has set up yet: it receives nothing until its manager activates it. */
const DEFAULT_SETTINGS: DeskSettingsValues = { receptionStatus: 'stopped', descriptionAr: null, descriptionEn: null, acceptsPersonal: false, ...DESK_DEFAULTS };
const UNCONFIGURED = (orgNodeId: string): DeskRecord => ({ orgNodeId, ...DEFAULT_SETTINGS });

/**
 * The setup of the departments that receive tickets: reception status, the description the sender sees, the durations, and the types.
 * Each key reaches the departments its scope says:
 * the ones the person manages, their unit, their unit and below, their company, or every department.
 */
@Injectable()
export class TicketSetupService {
  constructor(
    private readonly desks: TicketDeskRepository,
    private readonly tickets: TicketRepository,
    private readonly directory: TicketDirectory,
    private readonly org: OrgDirectoryService,
    private readonly transformer: TicketTransformer,
    private readonly notifier: TicketNotifier,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async listDesks(ctx: AccessContext): Promise<TicketDeskDto[]> {
    const departments = await departmentsFor(ctx, CorePermission.TicketsSetupView, this.directory);
    const dtos = await this.toDtos(departments);
    return dtos.sort((a, b) => a.pathAr.localeCompare(b.pathAr, 'ar'));
  }

  async getDesk(ctx: AccessContext, deskId: string): Promise<TicketDeskDto> {
    const department = await this.department(ctx, deskId, CorePermission.TicketsSetupView);
    return (await this.toDtos([department]))[0] as TicketDeskDto;
  }

  /** Activating needs a manager; the other two states can be set any time. */
  async saveDesk(ctx: AccessContext, deskId: string, input: TicketDeskSettingsInput): Promise<TicketDeskDto> {
    const department = await this.department(ctx, deskId, CorePermission.TicketsSetupEdit);
    if (input.receptionStatus === 'active' && !department.managerUserId) throw new DeskNoManagerError();
    const before = (await this.desks.find(deskId)) ?? UNCONFIGURED(deskId);
    const values: DeskSettingsValues = { ...input, descriptionAr: input.descriptionAr ?? null, descriptionEn: input.descriptionEn ?? null };
    await this.tx.run((tx) => this.desks.save(deskId, values, tx));
    this.audit(ctx.userId, TICKET_AUDIT.deskUpdated, deskId, { before: { ...before, orgNodeId: undefined }, after: input });
    return this.getDesk(ctx, deskId);
  }

  async createType(ctx: AccessContext, deskId: string, input: TicketTypeInput): Promise<TicketTypeDto> {
    await this.department(ctx, deskId, CorePermission.TicketsTypeCreate);
    const values = await this.valuesOf(deskId, input);
    const id = await this.tx.run(async (tx) => {
      await this.ensureDesk(deskId, tx);
      return this.desks.insertType(deskId, values, tx);
    });
    this.audit(ctx.userId, TICKET_AUDIT.typeCreated, id, { deskId, isPersonal: values.isPersonal, handlers: values.handlerUserIds });
    return this.typeDto(id);
  }

  async updateType(ctx: AccessContext, deskId: string, typeId: string, input: TicketTypeInput): Promise<TicketTypeDto> {
    await this.department(ctx, deskId, CorePermission.TicketsTypeUpdate);
    const existing = await this.ownType(deskId, typeId);
    const values = await this.valuesOf(deskId, input);
    const moved = await this.tx.run(async (tx) => {
      await this.desks.updateType(typeId, values, tx);
      const [handler] = values.handlerUserIds;
      const changedAssignee = values.isPersonal && handler && handler !== existing.handlers[0]?.id;
      return changedAssignee ? this.tickets.reassignOrphanedPersonal(typeId, handler, tx) : 0;
    });
    this.audit(ctx.userId, TICKET_AUDIT.typeUpdated, typeId, { deskId, isActive: values.isActive, isPersonal: values.isPersonal, handlers: values.handlerUserIds });
    if (moved > 0) await this.announceMoved(ctx, deskId, typeId, moved);
    return this.typeDto(typeId);
  }

  /** A type with tickets is only deactivated (its tickets keep their history); an unused one is deleted. */
  async removeType(ctx: AccessContext, deskId: string, typeId: string): Promise<{ deleted: boolean }> {
    await this.department(ctx, deskId, CorePermission.TicketsTypeDelete);
    const existing = await this.ownType(deskId, typeId);
    const used = await this.desks.typeHasTickets(typeId);
    await this.tx.run((tx) => (used ? this.desks.updateType(typeId, { ...existing, handlerUserIds: existing.handlers.map((h) => h.id), isActive: false }, tx) : this.desks.deleteType(typeId, tx)));
    this.audit(ctx.userId, TICKET_AUDIT.typeRemoved, typeId, { deskId, deleted: !used });
    return { deleted: !used };
  }

  /** The department manager and the employees of the department and of every unit below it, found by name or number, for the handlers picker. */
  async assignees(ctx: AccessContext, deskId: string, search?: string): Promise<PersonRefDto[]> {
    const department = await this.department(ctx, deskId, CorePermission.TicketsSetupView);
    return this.directory.assignableEmployees(department.orgNodeId, search);
  }

  // -------------------------------------------------------------------- helpers

  /** The department if this person's permission reaches it, else "not found" (so other departments are not revealed). */
  private async department(ctx: AccessContext, deskId: string, key: string): Promise<DepartmentFacts> {
    const found = (await departmentsFor(ctx, key, this.directory)).find((d) => d.orgNodeId === deskId);
    if (!found) throw new DeskNotFoundError();
    return found;
  }

  private async toDtos(departments: DepartmentFacts[]): Promise<TicketDeskDto[]> {
    const ids = departments.map((d) => d.orgNodeId);
    const [names, records, types, companies] = await Promise.all([this.org.describeNodes(ids), this.desks.findMany(ids), this.desks.typesOfDesks(ids), this.org.describeCompanies([...new Set(departments.map((d) => d.companyId))])]);
    const recordOf = new Map(records.map((r) => [r.orgNodeId, r]));
    return departments.map((department) =>
      this.transformer.toDeskDto({ department, names: names.get(department.orgNodeId), company: companies.get(department.companyId), settings: recordOf.get(department.orgNodeId) ?? UNCONFIGURED(department.orgNodeId), types: types.filter((t) => t.deskId === department.orgNodeId) }),
    );
  }

  /** A desk row exists as soon as it has anything attached to it. */
  private async ensureDesk(deskId: string, tx: Parameters<TicketDeskRepository['save']>[2]): Promise<void> {
    if (!(await this.desks.find(deskId))) await this.desks.save(deskId, DEFAULT_SETTINGS, tx);
  }

  private async ownType(deskId: string, typeId: string): Promise<TypeRecord> {
    const type = await this.desks.type(typeId);
    if (!type || type.deskId !== deskId) throw new NotFoundError('Ticket type', typeId);
    return type;
  }

  private async typeDto(typeId: string): Promise<TicketTypeDto> {
    return this.transformer.toTypeDto((await this.desks.type(typeId)) as TypeRecord);
  }

  /** Every handler must be an active employee of the unit or of a unit below it (or its manager), and a personal type has exactly one. */
  private async valuesOf(deskId: string, input: TicketTypeInput): Promise<TypeValues> {
    const handlerUserIds = [...new Set(input.handlerUserIds ?? [])];
    if ((await this.directory.membersOf(deskId, handlerUserIds)).length !== handlerUserIds.length) throw new AssigneeInvalidError();
    if (input.isPersonal && handlerUserIds.length === 0) throw new TypeNoHandlerError();
    if (input.isPersonal && handlerUserIds.length > 1) throw new TypePersonalOneHandlerError();
    return {
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      descriptionAr: input.descriptionAr ?? null,
      descriptionEn: input.descriptionEn ?? null,
      instructionsAr: sanitizeInstructions(input.instructionsAr),
      instructionsEn: sanitizeInstructions(input.instructionsEn),
      handlerUserIds,
      dueDays: input.dueDays ?? null,
      isPersonal: input.isPersonal,
      isActive: input.isActive,
    };
  }

  /** The manager is told how many personal tickets moved, never which. */
  private async announceMoved(ctx: AccessContext, deskId: string, typeId: string, count: number): Promise<void> {
    this.audit(ctx.userId, TICKET_AUDIT.personalReassigned, typeId, { deskId, count });
    const manager = (await this.directory.departments([deskId]))[0]?.managerUserId;
    const names = (await this.org.describeNodes([deskId])).get(deskId);
    if (!manager || manager === ctx.userId) return;
    await this.tx.run((tx) => this.notifier.sendCount({ userId: manager, deskId, deskNameAr: names?.nameAr ?? '', deskNameEn: names?.nameEn ?? '', count, tx }));
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'ticket', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
