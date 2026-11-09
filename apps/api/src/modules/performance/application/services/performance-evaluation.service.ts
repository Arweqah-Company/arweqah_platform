import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { PerformanceEvaluationRepository, type EvaluationRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceRosterPort, PerformanceStagePort, type RosterPerson } from '../../domain/contracts/performance-roster.port';

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
