import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, MILESTONES, milestoneProblems, type MilestoneListDto, type MilestoneRowDto, type MilestoneState, type RecordMilestoneInput } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { Clock } from '../../../../common/application/clock';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceEvaluationRepository, type EvaluationRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceMilestoneRepository, type MilestoneRow } from '../../domain/contracts/performance-milestone.repository';
import { PerformanceRosterPort, PerformanceTeamPort, type RosterPerson } from '../../domain/contracts/performance-roster.port';
import { effectiveDates } from '../../domain/rules/cycle-dates.rules';
import { MilestoneInvalidError, MilestoneNotRunningError } from '../../domain/errors/performance.errors';
import { PERFORMANCE_AUDIT, PERFORMANCE_EVALUATION_ENTITY } from '../messages/performance.messages';

const stateOf = (skipped: boolean, row: MilestoneRow | undefined): MilestoneState => (skipped ? 'skipped' : !row ? 'none' : row.acknowledgedAt ? 'acknowledged' : 'recorded');

/** The milestones of the year (FR-121): the manager records the minutes of each, the employee reads them and acknowledges. */
@Injectable()
export class PerformanceMilestoneService {
  constructor(
    private readonly cycles: PerformanceCycleRepository,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly milestones: PerformanceMilestoneRepository,
    private readonly roster: PerformanceRosterPort,
    private readonly team: PerformanceTeamPort,
    private readonly notifications: NotificationsService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** A team member's milestones for the manager (404 outside the scope or without an evaluation). */
  async ofMember(ctx: AccessContext, employeeId: string): Promise<MilestoneListDto> {
    const { evaluation, cycle } = await this.member(ctx, CorePermission.PerformanceMilestoneView, employeeId);
    return this.list(evaluation, cycle);
  }

  /** Keeps the minutes of a milestone of a team member and tells them. */
  async record(ctx: AccessContext, employeeId: string, key: string, input: RecordMilestoneInput): Promise<MilestoneListDto> {
    const { evaluation, cycle, person } = await this.member(ctx, CorePermission.PerformanceMilestoneRecord, employeeId);
    const def = MILESTONES.find((m) => m.key === key);
    if (!def) throw new NotFoundError('Milestone', key);
    if (def.skipped) throw new MilestoneNotRunningError();
    const problems = milestoneProblems(def.kind, input);
    if (problems.length) throw new MilestoneInvalidError(problems);
    await this.tx.run(async (tx) => {
      await this.milestones.save({ evaluationId: evaluation.id, key, input, recordedBy: ctx.userId }, tx);
      await this.notifications.notify({ userIds: [person.userId], tx, link: '/career-profile', titleAr: 'سُجّل محضر محطة لك', titleEn: 'The minutes of a milestone were recorded for you', bodyAr: 'اطّلع عليه في قسم «تقييم الأداء» وأقرّ باطلاعك.', bodyEn: 'Read it in the «performance evaluation» section and acknowledge reading it.' });
    });
    this.audit(ctx, PERFORMANCE_AUDIT.milestoneRecorded, evaluation.id);
    return this.list(evaluation, cycle);
  }

  /** The signed-in employee's own milestones. */
  async mine(ctx: AccessContext): Promise<MilestoneListDto> {
    const own = await this.own(ctx);
    return this.list(own.evaluation, own.cycle);
  }

  /** The employee read the minutes of a milestone (404 when none were recorded). */
  async acknowledge(ctx: AccessContext, key: string): Promise<MilestoneListDto> {
    const own = await this.own(ctx);
    const done = await this.tx.run((tx) => this.milestones.acknowledge(own.evaluation.id, key, this.clock.now(), tx));
    if (!done) throw new NotFoundError('Milestone', key);
    this.audit(ctx, PERFORMANCE_AUDIT.milestoneAcknowledged, own.evaluation.id);
    return this.list(own.evaluation, own.cycle);
  }

  private async list(evaluation: EvaluationRow, cycle: CycleRow): Promise<MilestoneListDto> {
    const rows = await this.milestones.forEvaluation(evaluation.id);
    const dates = effectiveDates(cycle.dates, cycle.fiscalYear);
    const items: MilestoneRowDto[] = MILESTONES.map((m) => {
      const row = rows.find((r) => r.milestoneKey === m.key);
      return {
        key: m.key, kind: m.kind, date: m.skipped ? null : dates.find((d) => d.key === m.key)?.from ?? null, state: stateOf(m.skipped, row),
        record: row ? { whereWeAre: row.whereWeAre, obstacle: row.obstacle, agreedAction: row.agreedAction, note: row.note, recordedAt: row.recordedAt.toISOString(), acknowledgedAt: row.acknowledgedAt ? row.acknowledgedAt.toISOString() : null } : null,
      };
    });
    return { fiscalYear: cycle.fiscalYear, items };
  }

  private async member(ctx: AccessContext, key: string, employeeId: string): Promise<{ evaluation: EvaluationRow; cycle: CycleRow; person: RosterPerson }> {
    const filter = ctx.filterFor(key);
    const cycle = await this.cycles.current();
    const person = filter ? await this.team.member(filter, employeeId) : null;
    const evaluation = cycle && person ? (await this.evaluations.forEmployees(cycle.id, [employeeId]))[0] : undefined;
    if (!cycle || !person || !evaluation) throw new NotFoundError('Evaluation', employeeId);
    return { evaluation, cycle, person };
  }

  private async own(ctx: AccessContext): Promise<{ evaluation: EvaluationRow; cycle: CycleRow }> {
    const cycle = await this.cycles.current();
    const person = await this.roster.person(ctx.userId);
    const evaluation = cycle && person ? await this.evaluations.find(cycle.id, person.employeeId) : null;
    if (!cycle || !evaluation) throw new NotFoundError('Evaluation', ctx.userId);
    return { evaluation, cycle };
  }

  private audit(ctx: AccessContext, action: string, evaluationId: string): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_EVALUATION_ENTITY, entityId: evaluationId } satisfies AuditEvent);
  }
}
