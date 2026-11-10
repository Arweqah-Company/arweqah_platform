import { Injectable } from '@nestjs/common';
import type { ReminderDto } from '@arweqah-platform/shared';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceEvaluationRepository } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceReminderRepository } from '../../domain/contracts/performance-reminder.repository';
import { PerformanceRosterPort } from '../../domain/contracts/performance-roster.port';
import { reminderDue } from '../../domain/rules/reminder-send.rules';

/** The words HR wrote: the English ones when there are any, else the Arabic. No names and no course titles (FR-56). */
const words = (r: ReminderDto) => ({ titleAr: r.titleAr, titleEn: r.titleEn || r.titleAr, bodyAr: r.bodyAr, bodyEn: r.bodyEn || r.bodyAr });

/**
 * Sends the automatic reminders of the cycle (FR-124), once each morning: the employee's reminder to those who have not sent their self-evaluation (on its days before the
 * deadline, in the self stage), and the manager's reminder to those with an evaluation waiting (every N days, in the managers' stage). It stops when the work is done
 * (a person who finished is not told), never runs on the weekend, and never sends twice in a day. The calibration and approval holders' reminder waits for a lookup
 * of who holds a key; the milestone reminder waits for the owner's decision on the milestone calendar (plan §3.5c).
 */
@Injectable()
export class PerformanceReminderSendService {
  constructor(
    private readonly reminders: PerformanceReminderRepository,
    private readonly cycles: PerformanceCycleRepository,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly roster: PerformanceRosterPort,
    private readonly notifications: NotificationsService,
  ) {}

  /** Sends what is due on `today` (a Riyadh date); returns how many people were told. */
  async run(today: string): Promise<number> {
    const cycle = await this.cycles.current();
    if (!cycle || cycle.stage === 'closed') return 0;
    const lastSent = await this.reminders.lastSent();
    const deadline = cycle.dates.find((d) => d.key === 'self_deadline')?.from ?? null;
    let told = 0;
    for (const reminder of await this.reminders.list()) {
      const due = reminder.on && reminderDue({ kind: reminder.kind, days: reminder.days, today, deadline, lastSentOn: lastSent.get(reminder.id) ?? null });
      if (due) told += await this.send(cycle, reminder, today);
    }
    return told;
  }

  /** Tells the people the reminder is for (nobody when the work is done) and marks it sent today. */
  private async send(cycle: CycleRow, reminder: ReminderDto, today: string): Promise<number> {
    const people = await this.audience(cycle, reminder);
    if (!people.length) return 0;
    await this.notifications.notify({ userIds: people, link: reminder.kind === 'self' ? '/career-profile' : '/performance-team', ...words(reminder) });
    await this.reminders.markSent(reminder.id, today);
    return people.length;
  }

  private async audience(cycle: CycleRow, reminder: ReminderDto): Promise<string[]> {
    if (reminder.kind === 'self' && cycle.stage === 'self') return this.withoutSelf(cycle);
    if (reminder.kind === 'mgr' && cycle.stage === 'mgr') return this.waitingManagers(cycle);
    return [];
  }

  /** The employees who have not sent their self-evaluation. */
  private async withoutSelf(cycle: CycleRow): Promise<string[]> {
    const people = await this.roster.everyone();
    const evaluations = await this.evaluations.forEmployees(cycle.id, people.map((p) => p.employeeId));
    const sent = await this.evaluations.selfSentIds(evaluations.map((e) => e.id));
    const waiting = new Set(evaluations.filter((e) => !sent.has(e.id)).map((e) => e.employeeId));
    return people.filter((p) => waiting.has(p.employeeId)).map((p) => p.userId);
  }

  /** The direct managers who have an evaluation whose own copy was not sent yet. */
  private async waitingManagers(cycle: CycleRow): Promise<string[]> {
    const people = await this.roster.everyone();
    const evaluations = await this.evaluations.forEmployees(cycle.id, people.map((p) => p.employeeId));
    const reviews = await this.evaluations.reviews(evaluations.map((e) => e.id));
    const done = new Set(reviews.filter((r) => r.level === 'direct' && r.sentAt).map((r) => r.evaluationId));
    return [...new Set(evaluations.filter((e) => e.managerUserId && !done.has(e.id)).map((e) => e.managerUserId as string))];
  }
}

