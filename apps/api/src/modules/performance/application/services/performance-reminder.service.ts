import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { REMINDER_MAX, normalizeReminderDays, type ReminderDto, type ReminderInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { PerformanceReminderRepository } from '../../domain/contracts/performance-reminder.repository';
import { ReminderLimitError } from '../../domain/errors/performance.errors';
import { PERFORMANCE_AUDIT, PERFORMANCE_REMINDER_ENTITY } from '../messages/performance.messages';

/** The automatic reminders HR keeps for the evaluation cycle (FR-124): add, change and remove, each with its words. The sending is a later delivery. */
@Injectable()
export class PerformanceReminderService {
  constructor(
    private readonly reminders: PerformanceReminderRepository,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  list(): Promise<ReminderDto[]> {
    return this.reminders.list();
  }

  /** Adds a reminder; at most `REMINDER_MAX` are kept (422 `REMINDER_LIMIT`). */
  async create(ctx: AccessContext, input: ReminderInput): Promise<ReminderDto> {
    if ((await this.reminders.count()) >= REMINDER_MAX) throw new ReminderLimitError(REMINDER_MAX);
    const saved = await this.tx.run((tx) => this.reminders.insert(normalized(input), ctx.userId, tx));
    this.audit(ctx, PERFORMANCE_AUDIT.reminderCreated, saved.id, { kind: saved.kind, on: saved.on, days: saved.days });
    return saved;
  }

  async update(ctx: AccessContext, id: string, input: ReminderInput): Promise<ReminderDto> {
    const saved = await this.tx.run((tx) => this.reminders.update(id, normalized(input), ctx.userId, tx));
    if (!saved) throw new NotFoundError('Reminder', id);
    this.audit(ctx, PERFORMANCE_AUDIT.reminderUpdated, id, { kind: saved.kind, on: saved.on, days: saved.days });
    return saved;
  }

  async remove(ctx: AccessContext, id: string): Promise<void> {
    if (!(await this.tx.run((tx) => this.reminders.remove(id, tx)))) throw new NotFoundError('Reminder', id);
    this.audit(ctx, PERFORMANCE_AUDIT.reminderRemoved, id, {});
  }

  /** The audit keeps what the reminder does, never the words of its title and text. */
  private audit(ctx: AccessContext, action: string, id: string, changes: Record<string, unknown>): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_REMINDER_ENTITY, entityId: id, changes } satisfies AuditEvent);
  }
}

/** The days of the employee's reminder each once, the farthest first; the other kinds have their one number as it is. */
const normalized = (input: ReminderInput): ReminderInput => (input.kind === 'self' ? { ...input, days: normalizeReminderDays(input.days) } : input);
