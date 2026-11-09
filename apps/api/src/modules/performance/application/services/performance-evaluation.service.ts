import { Injectable } from '@nestjs/common';
import type { CycleDate } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { PerformanceEvaluationRepository, type EvaluationRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceRosterPort, PerformanceStagePort, type RosterPerson } from '../../domain/contracts/performance-roster.port';
import type { CycleStage } from '@arweqah-platform/shared';
import { CYCLE_DATE_LABELS, STAGE_NOTICES } from '../messages/performance.messages';

/** The evaluations of a cycle: one per employee who holds a title whose stage has a rule, made when the cycle opens (and when a late joiner first asks). */
@Injectable()
export class PerformanceEvaluationService {
  constructor(
    private readonly roster: PerformanceRosterPort,
    private readonly stages: PerformanceStagePort,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly notifications: NotificationsService,
  ) {}

  /** Makes the evaluation of everyone the cycle evaluates and tells them it opened. */
  async openFor(cycleId: string, tx: TransactionContext): Promise<number> {
    const people = await this.roster.everyone();
    const stageOf = await this.stageByTitle(people);
    const rows = people.flatMap((p) => { const stage = stageOf.get(p.titleId); return stage ? [{ employeeId: p.employeeId, stageNo: stage, managerUserId: p.managerUserId, userId: p.userId }] : []; });
    await this.evaluations.createMany(cycleId, rows.map(({ userId: _u, ...r }) => r), tx);
    if (rows.length) await this.tell(rows.map((r) => r.userId), tx);
    return rows.length;
  }

  /** Tells everyone the cycle evaluates, and their direct managers, that a date of the cycle changed (the stage's name and the new date). */
  async tellDateChanged(date: CycleDate, tx: TransactionContext): Promise<void> {
    const people = await this.roster.everyone();
    const stageOf = await this.stageByTitle(people);
    const evaluated = people.filter((p) => stageOf.has(p.titleId));
    const userIds = [...new Set(evaluated.flatMap((p) => (p.managerUserId ? [p.userId, p.managerUserId] : [p.userId])))];
    if (!userIds.length) return;
    const label = CYCLE_DATE_LABELS[date.key];
    const when = date.to ? `${date.from} → ${date.to}` : date.from;
    await this.notifications.notify({ userIds, link: '/career-profile', tx, titleAr: 'تغيّر موعد في دورة تقييم الأداء', titleEn: 'A date of the performance evaluation cycle changed', bodyAr: `«${label.ar}»: ${when}`, bodyEn: `«${label.en}»: ${when}` });
  }

  /** Tells the people who work in a stage that the cycle moved into it: the evaluated employees, their direct managers, or both (calibration and approval have no holders yet). */
  async tellStage(stage: CycleStage, tx: TransactionContext): Promise<void> {
    const notice = STAGE_NOTICES[stage];
    if (!notice) return;
    const people = await this.roster.everyone();
    const stageOf = await this.stageByTitle(people);
    const evaluated = people.filter((p) => stageOf.has(p.titleId));
    const employees = notice.to === 'managers' ? [] : evaluated.map((p) => p.userId);
    const managers = notice.to === 'employees' ? [] : evaluated.flatMap((p) => (p.managerUserId ? [p.managerUserId] : []));
    const userIds = [...new Set([...employees, ...managers])];
    if (!userIds.length) return;
    await this.notifications.notify({ userIds, link: notice.link, tx, titleAr: notice.titleAr, titleEn: notice.titleEn, bodyAr: notice.bodyAr, bodyEn: notice.bodyEn });
  }

  /** The person's evaluation in the cycle, made now when they joined after it opened; null when their title has no stage. */
  async ensure(cycleId: string, person: RosterPerson, open: boolean, tx: (work: (t: TransactionContext) => Promise<void>) => Promise<void>): Promise<EvaluationRow | null> {
    const found = await this.evaluations.find(cycleId, person.employeeId);
    if (found || !open) return found;
    const stage = (await this.stages.stageOf(person.titleId))?.stage;
    if (!stage) return null;
    await tx((t) => this.evaluations.createMany(cycleId, [{ employeeId: person.employeeId, stageNo: stage, managerUserId: person.managerUserId }], t));
    return this.evaluations.find(cycleId, person.employeeId);
  }

  private async stageByTitle(people: RosterPerson[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    for (const titleId of new Set(people.map((p) => p.titleId))) {
      const stage = (await this.stages.stageOf(titleId))?.stage;
      if (stage) out.set(titleId, stage);
    }
    return out;
  }

  private tell(userIds: string[], tx: TransactionContext): Promise<void> {
    return this.notifications.notify({
      userIds, link: '/career-profile', tx,
      titleAr: 'فُتحت دورة تقييم الأداء', titleEn: 'The performance evaluation cycle is open',
      bodyAr: 'ابدأ تقييمك الذاتي من قسم «تقييم الأداء» في مسارك الوظيفي.', bodyEn: 'Start your self-evaluation from the «performance evaluation» section of your career path.',
    });
  }
}
