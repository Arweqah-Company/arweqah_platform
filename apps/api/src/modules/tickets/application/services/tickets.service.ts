import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { riyadhToday, type CreateTicketInput, type Paginated, type TicketDto, type TicketFilterOptionsDto, type TicketReplyInput, type TicketsPageDto, type TicketsQuery } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { FilesService } from '../../../../core/files/application/files.service';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TicketDeskRepository } from '../../domain/contracts/ticket-desk.repository';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import {
  DeskNoManagerError,
  DeskNotFoundError,
  DeskNotStartedError,
  DeskPausedError,
  DeskStoppedError,
  DueDateTooEarlyError,
  NotADepartmentError,
  PersonalNotAcceptedError,
  TicketNotFoundError,
  TicketRevisionConflictError,
  TicketStateInvalidError,
  TypeInactiveError,
  TypeNoHandlerError,
} from '../../domain/errors/ticket.errors';
import { deskUnavailableReason } from '../../domain/rules/ticket-flags.rules';
import { abilitiesFor, nextState, reopenDaysLeft } from '../../domain/rules/ticket-lifecycle.rules';
import { earliestNeededBy, resolveNeededBy } from '../../domain/rules/working-days.rules';
import type { DeskRecord, DepartmentFacts, TicketRow, TicketViewer, TypeRecord } from '../../domain/types/ticket.types';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { TicketAccessPolicy } from '../policies/ticket-access.policy';
import { TicketTransformer, type DeskNames } from '../transformers/ticket.transformer';
import { TicketNotifier } from './ticket-notifier.service';

const REASON_ERRORS = { stopped: DeskStoppedError, paused: DeskPausedError, not_started: DeskNotStartedError, no_manager: DeskNoManagerError } as const;

/** Sending, finding, reading and answering tickets. Closing and reopening are in TicketLifecycleService. */
@Injectable()
export class TicketsService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly desks: TicketDeskRepository,
    private readonly directory: TicketDirectory,
    private readonly org: OrgDirectoryService,
    private readonly files: FilesService,
    private readonly policy: TicketAccessPolicy,
    private readonly transformer: TicketTransformer,
    private readonly notifier: TicketNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async create(viewer: TicketViewer, input: CreateTicketInput): Promise<TicketDto> {
    const userId = viewer.userId;
    const { type, desk, department } = await this.target(input.typeId);
    const today = riyadhToday(this.clock.now());
    this.assertReceiving(desk, department, today);
    const assigneeUserId = await this.assignee(type, desk);
    const neededBy = resolveNeededBy({ chosen: input.neededBy, today, typeDueDays: type.dueDays, deskDueDays: desk.defaultDueDays, minLeadDays: desk.minLeadDays });
    if (neededBy === null) throw new DueDateTooEarlyError(earliestNeededBy(today, desk.minLeadDays));
    await this.assertFiles(userId, input.fileIds);
    const id = await this.tx.run(async (tx) => {
      const ticketId = await this.tickets.insert({ senderUserId: userId, deskId: desk.orgNodeId, typeId: type.id, title: input.title, details: input.details, priority: input.priority, neededBy, assigneeUserId, isPersonal: type.isPersonal }, tx);
      await this.tickets.appendEvent({ ticketId, type: 'created', actorUserId: userId, body: input.details || null, fileIds: input.fileIds }, tx);
      const row = (await this.tickets.find(ticketId, tx)) as TicketRow;
      await this.notifier.send({ kind: 'created', ticket: row, recipients: this.policy.unitRecipients(row), email: true, actorUserId: userId, tx });
      return ticketId;
    });
    this.audit(userId, TICKET_AUDIT.created, id, { deskId: desk.orgNodeId, typeId: type.id, priority: input.priority, isPersonal: type.isPersonal });
    return this.get(viewer, id);
  }

  async list(viewer: TicketViewer, query: TicketsQuery): Promise<TicketsPageDto> {
    const page = await this.tickets.list({ viewer, tab: query.tab, deskId: query.deskId, typeId: query.typeId, assigneeId: query.assigneeId, status: query.status, search: query.search, groupBy: query.groupBy, page: query.page, pageSize: query.pageSize });
    const names = await this.deskNames(page.items.map((r) => r.deskId));
    const now = this.clock.now();
    const result: Paginated<ReturnType<TicketTransformer['toListItem']>> = { ...page, items: page.items.map((r) => this.transformer.toListItem(r, names.get(r.deskId), now)) };
    return { ...result, groupBy: page.groupBy };
  }

  async get(viewer: TicketViewer, id: string): Promise<TicketDto> {
    const row = await this.tickets.find(id);
    const relations = this.policy.assertCanView(viewer, row);
    const found = row as TicketRow;
    const events = await this.tickets.events(id);
    const [attachments, names] = await Promise.all([this.tickets.attachments(events.map((e) => e.id)), this.deskNames([found.deskId])]);
    return this.transformer.toDetail({ row: found, desk: names.get(found.deskId), relations, events, attachments, now: this.clock.now() });
  }

  async reply(viewer: TicketViewer, id: string, input: TicketReplyInput): Promise<TicketDto> {
    const userId = viewer.userId;
    const row = await this.tickets.find(id);
    const relations = this.policy.assertCanView(viewer, row);
    const found = row as TicketRow;
    const now = this.clock.now();
    if (!abilitiesFor(relations, found.status, reopenDaysLeft(found.status, found.closedAt, found.deskReopenWindowDays, now)).reply) throw new TicketStateInvalidError('reply', found.status);
    await this.assertFiles(userId, input.fileIds);
    const fromUnit = relations.includes('assignee') || relations.includes('manager') || relations.includes('desk');
    const senderAnswersClosing = relations.includes('sender') && !fromUnit && found.status === 'close_requested';
    await this.tx.run(async (tx) => {
      const patch = { lastActivityAt: now, ...(fromUnit && !found.firstResponseAt ? { firstResponseAt: now } : {}), ...(senderAnswersClosing ? { ...nextState('sender_reply', found.status), closeRequestedAt: null } : {}) };
      await this.patchOrFail(found, patch, tx);
      await this.tickets.appendEvent({ ticketId: id, type: 'reply', actorUserId: userId, body: input.body, fileIds: input.fileIds }, tx);
      await this.notifier.send({ kind: 'reply', ticket: found, recipients: fromUnit ? [found.senderUserId] : this.policy.unitRecipients(found), actorUserId: userId, tx });
    });
    this.audit(userId, TICKET_AUDIT.replied, id, { files: input.fileIds.length });
    return this.get(viewer, id);
  }

  async options(viewer: TicketViewer): Promise<TicketFilterOptionsDto> {
    const rows = await this.tickets.filterOptions(viewer);
    const names = await this.deskNames(rows.desks);
    return { desks: rows.desks.map((id) => ({ id, nameAr: names.get(id)?.nameAr ?? '', nameEn: names.get(id)?.nameEn ?? '' })), types: rows.types, assignees: rows.assignees, hasInbox: rows.hasInbox, hasTeam: rows.hasTeam };
  }

  /** The stream of an attachment, for someone who may see the ticket it belongs to. */
  async openAttachment(viewer: TicketViewer, ticketId: string, fileId: string) {
    this.policy.assertCanView(viewer, await this.tickets.find(ticketId));
    if (!(await this.tickets.attachedFile(ticketId, fileId))) throw new TicketNotFoundError();
    const file = await this.files.getGranted(fileId);
    return { file, opened: await this.files.open(file) };
  }

  // -------------------------------------------------------------------- helpers

  private async target(typeId: string): Promise<{ type: TypeRecord; desk: DeskRecord; department: DepartmentFacts }> {
    const type = await this.desks.type(typeId);
    if (!type) throw new TicketNotFoundError();
    if (!type.isActive) throw new TypeInactiveError();
    const desk = await this.desks.find(type.deskId);
    const department = (await this.directory.departments([type.deskId]))[0];
    if (!desk) throw new DeskNotFoundError();
    if (!department) throw new NotADepartmentError();
    return { type, desk, department };
  }

  private assertReceiving(desk: DeskRecord, department: DepartmentFacts, today: string): void {
    const reason = deskUnavailableReason({ receptionStatus: desk.receptionStatus, startDate: department.startDate, hasManager: !!department.managerUserId }, today);
    if (reason) throw new REASON_ERRORS[reason]();
  }

  /** The type's assignee when active. A personal type must have one, and the desk must accept personal requests. */
  private async assignee(type: TypeRecord, desk: DeskRecord): Promise<string | null> {
    const active = type.defaultAssigneeUserId ? await this.directory.activeEmployee(type.defaultAssigneeUserId) : null;
    if (type.isPersonal && !desk.acceptsPersonal) throw new PersonalNotAcceptedError();
    if (type.isPersonal && !active) throw new TypeNoHandlerError();
    return active?.id ?? null;
  }

  /** Files must be the poster's own uploads. */
  private async assertFiles(userId: string, fileIds: string[]): Promise<void> {
    for (const id of fileIds) await this.files.getOwned(id, userId);
  }

  private async patchOrFail(row: TicketRow, patch: Parameters<TicketRepository['patch']>[2], tx: Parameters<TicketRepository['patch']>[3]): Promise<void> {
    if (!(await this.tickets.patch(row.id, row.revision, patch, tx))) throw new TicketRevisionConflictError();
  }

  private async deskNames(ids: string[]): Promise<Map<string, DeskNames>> {
    return this.org.describeNodes([...new Set(ids)]);
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'ticket', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}

