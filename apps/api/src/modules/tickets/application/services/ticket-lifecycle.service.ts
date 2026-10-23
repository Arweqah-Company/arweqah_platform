import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TicketAbilitiesDto, TicketEventType } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { JobScheduler } from '../../../../core/messaging/application/outbox';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { ReopenWindowExpiredError, TicketRevisionConflictError, TicketStateInvalidError } from '../../domain/errors/ticket.errors';
import { abilitiesFor, nextState, reopenDaysLeft, type TicketAction } from '../../domain/rules/ticket-lifecycle.rules';
import type { TicketPatch, TicketRow } from '../../domain/types/ticket.types';
import { TICKET_AUDIT, TICKET_TOPICS, type NoticeKind } from '../messages/ticket.messages';
import { TicketAccessPolicy } from '../policies/ticket-access.policy';
import { TicketNotifier } from './ticket-notifier.service';

/** The actions a person asks for (the automatic closing is separate). */
export type PersonAction = 'request_close' | 'close_without_execution' | 'confirm_close' | 'decline_close' | 'reopen';

const ABILITY: Record<PersonAction, keyof TicketAbilitiesDto> = {
  request_close: 'requestClose',
  close_without_execution: 'closeWithoutExecution',
  confirm_close: 'confirmClose',
  decline_close: 'declineClose',
  reopen: 'reopen',
};

interface Outcome {
  event: TicketEventType;
  audit: string;
  /** Who is told, and what. */
  notice: { kind: NoticeKind; to: 'sender' | 'unit' | 'both'; email?: boolean } | null;
}

const OUTCOMES: Record<TicketAction, Outcome> = {
  request_close: { event: 'close_requested', audit: TICKET_AUDIT.closeRequested, notice: { kind: 'closeRequested', to: 'sender', email: true } },
  close_without_execution: { event: 'closed_not_executed', audit: TICKET_AUDIT.closedNotExecuted, notice: { kind: 'closedNotExecuted', to: 'sender' } },
  confirm_close: { event: 'confirmed', audit: TICKET_AUDIT.confirmed, notice: null },
  decline_close: { event: 'close_declined', audit: TICKET_AUDIT.closeDeclined, notice: { kind: 'reply', to: 'unit' } },
  reopen: { event: 'reopened', audit: TICKET_AUDIT.reopened, notice: { kind: 'reopened', to: 'unit' } },
  auto_close: { event: 'auto_closed', audit: TICKET_AUDIT.autoClosed, notice: { kind: 'autoClosed', to: 'both', email: true } },
  sender_reply: { event: 'reply', audit: TICKET_AUDIT.replied, notice: null },
};

const DAY_MS = 86_400_000;

/** Closing, confirming, declining, reopening and the automatic closing of tickets. */
@Injectable()
export class TicketLifecycleService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly policy: TicketAccessPolicy,
    private readonly notifier: TicketNotifier,
    private readonly scheduler: JobScheduler,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async act(userId: string, id: string, action: PersonAction, message?: string): Promise<void> {
    const row = await this.tickets.find(id);
    const relations = this.policy.assertCanView(userId, row);
    const found = row as TicketRow;
    const left = reopenDaysLeft(found.status, found.closedAt, found.deskReopenWindowDays, this.clock.now());
    if (!abilitiesFor(relations, found.status, left)[ABILITY[action]]) {
      throw action === 'reopen' && found.status === 'closed' ? new ReopenWindowExpiredError() : new TicketStateInvalidError(action, found.status);
    }
    await this.apply(found, action, userId, message ?? null);
  }

  /** Called by the job scheduled when closing was requested; does nothing if the ticket moved on since. */
  async autoClose(ticketId: string, closeRequestedAt: string): Promise<void> {
    const row = await this.tickets.find(ticketId);
    if (!row || row.status !== 'close_requested' || row.closeRequestedAt?.toISOString() !== closeRequestedAt) return;
    await this.apply(row, 'auto_close', null, null);
  }

  /** Tells the unit about tickets that have been quiet for too long, once per quiet period. */
  async announceStale(): Promise<number> {
    const now = this.clock.now();
    const stale = await this.tickets.staleCandidates(now);
    for (const ticket of stale) {
      const recipients = [...this.policy.unitRecipients(ticket), ...(!ticket.isPersonal && ticket.deskManagerUserId ? [ticket.deskManagerUserId] : [])];
      await this.tx.run((tx) => this.notifier.send({ kind: 'stale', ticket, recipients, email: true, tx }));
    }
    await this.tickets.markStaleNotified(stale.map((t) => t.id), now);
    return stale.length;
  }

  private async apply(row: TicketRow, action: TicketAction, actorUserId: string | null, message: string | null): Promise<void> {
    const next = nextState(action, row.status);
    if (!next) throw new TicketStateInvalidError(action, row.status);
    const outcome = OUTCOMES[action];
    const now = this.clock.now();
    await this.tx.run(async (tx) => {
      const changed = await this.tickets.patch(row.id, row.revision, this.patchFor(action, next, now), tx);
      if (!changed) throw new TicketRevisionConflictError();
      await this.tickets.appendEvent({ ticketId: row.id, type: outcome.event, actorUserId, body: message, fileIds: [] }, tx);
      await this.schedule(row, action, now, tx);
      if (outcome.notice) await this.notifier.send({ kind: outcome.notice.kind, ticket: row, recipients: this.recipients(row, outcome.notice.to), email: outcome.notice.email, actorUserId, tx });
    });
    this.audit(actorUserId, outcome.audit, row.id, { from: row.status, to: next.status });
  }

  private patchFor(action: TicketAction, next: NonNullable<ReturnType<typeof nextState>>, now: Date): TicketPatch {
    const patch: TicketPatch = { status: next.status, closeReason: next.closeReason, lastActivityAt: now };
    if (action === 'request_close') patch.closeRequestedAt = now;
    if (action === 'decline_close' || action === 'reopen') patch.closeRequestedAt = null;
    if (next.status === 'closed') patch.closedAt = now;
    if (action === 'reopen') {
      patch.closedAt = null;
      patch.reopenCountIncrement = true;
    }
    return patch;
  }

  /** Asking to close starts the clock for the automatic closing; every other change stops it. */
  private async schedule(row: TicketRow, action: TicketAction, now: Date, tx: TransactionContext): Promise<void> {
    const dedupeKey = `ticket:${row.id}:auto-close`;
    if (action !== 'request_close') return this.scheduler.cancel(dedupeKey, tx);
    const runAt = new Date(now.getTime() + row.deskAutoCloseDays * DAY_MS);
    await this.scheduler.schedule(TICKET_TOPICS.autoClose, { ticketId: row.id, closeRequestedAt: now.toISOString() }, { runAt, dedupeKey, tx });
  }

  private recipients(row: TicketRow, to: 'sender' | 'unit' | 'both'): string[] {
    const unit = this.policy.unitRecipients(row);
    return to === 'sender' ? [row.senderUserId] : to === 'unit' ? unit : [row.senderUserId, ...unit];
  }

  private audit(actorId: string | null, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'ticket', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
