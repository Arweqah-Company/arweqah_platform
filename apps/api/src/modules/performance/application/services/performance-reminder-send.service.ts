import { Injectable } from '@nestjs/common';
import { CorePermission, MILESTONES, type CycleDate, type ReminderDto } from '@arweqah-platform/shared';
import { PermissionHoldersService } from '../../../../core/access/application/permission-holders.service';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceEvaluationRepository } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceReminderRepository } from '../../domain/contracts/performance-reminder.repository';
import { PerformanceMilestoneRepository } from '../../domain/contracts/performance-milestone.repository';
import { PerformanceRosterPort } from '../../domain/contracts/performance-roster.port';
import { effectiveDates } from '../../domain/rules/cycle-dates.rules';
import { reminderDue } from '../../domain/rules/reminder-send.rules';

/** The dates a reminder counts from: the self-evaluation deadline, one per milestone that runs for the milestone reminder, none for the others. */
function occasions(reminder: ReminderDto, dates: readonly CycleDate[]): { date: string | null; milestone: string | null }[] {
  if (reminder.kind === 'self') return [{ date: dates.find((d) => d.key === 'self_deadline')?.from ?? null, milestone: null }];
  if (reminder.kind !== 'mile') return [{ date: null, milestone: null }];
  return MILESTONES.filter((m) => !m.skipped).map((m) => ({ date: dates.find((d) => d.key === m.key)?.from ?? null, milestone: m.key }));
}

/** The words HR wrote: the English ones when there are any, else the Arabic. No names and no course titles (FR-56). */
const words = (r: ReminderDto) => ({ titleAr: r.titleAr, titleEn: r.titleEn || r.titleAr, bodyAr: r.bodyAr, bodyEn: r.bodyEn || r.bodyAr });

/**
 * Sends the automatic reminders of the cycle (FR-124), once each morning: the employee's reminder to those who have not sent their self-evaluation (on its days before the
 * deadline, in the self stage), the manager's reminder to those with an evaluation waiting (every N days, in the managers' stage), the milestone reminder to the managers who
 * have not recorded the minutes of a milestone (on its days before the date HR set for it), and the holders' reminder to whoever holds the key of the stage (calibration, then
 * approval). It stops when the work is done (a person who finished is not told), never runs on the weekend, and never sends twice in a day.
 */
@Injectable()
export class PerformanceReminderSendService {
  constructor(
    private readonly reminders: PerformanceReminderRepository,
    private readonly cycles: PerformanceCycleRepository,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly roster: PerformanceRosterPort,
    private readonly milestones: PerformanceMilestoneRepository,
    private readonly notifications: NotificationsService,
    private readonly holders: PermissionHoldersService,
  ) {}

  /** Sends what is due on `today` (a Riyadh date); returns how many people were told. */
  async run(today: string): Promise<number> {
    const cycle = await this.cycles.current();
    if (!cycle || cycle.stage === 'closed') return 0;
    const lastSent = await this.reminders.lastSent();
    const dates = effectiveDates(cycle.dates, cycle.fiscalYear);
    let told = 0;
    for (const reminder of await this.reminders.list()) {
      for (const on of occasions(reminder, dates)) {
        const due = reminder.on && reminderDue({ kind: reminder.kind, days: reminder.days, today, deadline: on.date, lastSentOn: lastSent.get(reminder.id) ?? null });
        if (!due) continue;
        told += await this.send(cycle, reminder, { today, milestone: on.milestone });
        lastSent.set(reminder.id, today); // one send a day, also across the occasions of one reminder
      }
    }
    return told;
  }

  /** Tells the people the reminder is for (nobody when the work is done) and marks it sent today. */
  private async send(cycle: CycleRow, reminder: ReminderDto, at: { today: string; milestone: string | null }): Promise<number> {
    const people = await this.audience(cycle, reminder, at.milestone);
    if (!people.length) return 0;
    await this.notifications.notify({ userIds: people, link: reminder.kind === 'self' ? '/career-profile' : '/performance-team', ...words(reminder) });
    await this.reminders.markSent(reminder.id, at.today);
    return people.length;
  }

  /** Who the reminder is for now: each kind has the stage it works in and the people who still have the work. */
  private audience(cycle: CycleRow, reminder: ReminderDto, milestone: string | null): Promise<string[]> {
    const work: Record<string, { stage: string | null; people: () => Promise<string[]> } | undefined> = {
      self: { stage: 'self', people: () => this.withoutSelf(cycle) },
      mgr: { stage: 'mgr', people: () => this.waitingManagers(cycle) },
      mile: { stage: null, people: () => (milestone ? this.managersWithoutMinutes(cycle, milestone) : Promise.resolve([])) },
      appr: { stage: cycle.stage === 'cal' || cycle.stage === 'appr' ? cycle.stage : 'none', people: () => this.holders.holdersOf(cycle.stage === 'cal' ? CorePermission.PerformanceCalibrate : CorePermission.PerformanceApprove) },
    };
    const mine = work[reminder.kind];
    return mine && (mine.stage === null || mine.stage === cycle.stage) ? mine.people() : Promise.resolve([]);
  }

  /** The direct managers with a team member whose minutes of the milestone were not recorded. */
  private async managersWithoutMinutes(cycle: CycleRow, milestone: string): Promise<string[]> {
    const people = await this.roster.everyone();
    const evaluations = await this.evaluations.forEmployees(cycle.id, people.map((p) => p.employeeId));
    const recorded = await this.milestones.recordedAmong(milestone, evaluations.map((e) => e.id));
    return [...new Set(evaluations.filter((e) => e.managerUserId && !recorded.has(e.id)).map((e) => e.managerUserId as string))];
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

