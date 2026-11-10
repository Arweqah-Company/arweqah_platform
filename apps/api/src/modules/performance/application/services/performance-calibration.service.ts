import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { calibratedScore, levelOf, type AdjustCalibrationInput, type CalibrationPageDto, type CalibrationQuery, type CalibrationRowDto, type GradeBand, type ScoreParts, type StageTemplate } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { PerformanceCalibrationRepository } from '../../domain/contracts/performance-calibration.repository';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceEvaluationRepository, type EvaluationRow, type ReviewRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceRosterPort, PerformanceStagePort, type RosterPerson } from '../../domain/contracts/performance-roster.port';
import { CalibrationNotOpenError, CalibrationWaitingError } from '../../domain/errors/performance.errors';
import { PERFORMANCE_AUDIT, PERFORMANCE_EVALUATION_ENTITY } from '../messages/performance.messages';
import { PerformanceCycleService } from './performance-cycle.service';
import { PerformanceScoreService } from './performance-score.service';

/** One person of the cycle with the manager score parts (null while no manager evaluation was sent) and the calibration adjustment. */
export interface ScoredPerson {
  evaluation: EvaluationRow;
  person: RosterPerson;
  template: StageTemplate;
  review: ReviewRow | undefined;
  parts: ScoreParts | null;
  adjustment: number;
  reason: string | null;
}

/** The manager score that calibration starts from: the upper manager's sent evaluation when there is one, else the direct manager's. */
export const sentReview = (reviews: readonly ReviewRow[]): ReviewRow | undefined => reviews.find((r) => r.level === 'upper' && r.sentAt) ?? reviews.find((r) => r.level === 'direct' && r.sentAt);

const matches = (r: CalibrationRowDto, q: CalibrationQuery): boolean =>
  (!q.search || r.name.toLowerCase().includes(q.search.toLowerCase()))
  && (!q.level || r.levelName === q.level)
  && (!q.stage || r.stage === q.stage)
  && (!q.adjusted || (q.adjusted === 'yes') === (r.adjustment !== 0));

/** Calibration (FR-122): the managers' scores side by side, the half-point adjustments with their reasons, and sending them on to approval. */
@Injectable()
export class PerformanceCalibrationService {
  constructor(
    private readonly cycles: PerformanceCycleRepository,
    private readonly cycleService: PerformanceCycleService,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly calibrations: PerformanceCalibrationRepository,
    private readonly roster: PerformanceRosterPort,
    private readonly stages: PerformanceStagePort,
    private readonly scores: PerformanceScoreService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  /** Everyone of the cycle with the managers' score and the calibrated one; the page is filtered, the distribution and the waiting count are over everyone. */
  async list(query: CalibrationQuery): Promise<CalibrationPageDto> {
    const cycle = await this.cycles.current();
    if (!cycle) return { cycle: null, items: [], total: 0, page: query.page, pageSize: query.pageSize, distribution: [], waitingCount: 0 };
    const rows = await this.rowsOf(cycle);
    const scale = cycle.snapshot.scale;
    const shown = rows.filter((r) => matches(r, query));
    const start = (query.page - 1) * query.pageSize;
    return {
      cycle: { fiscalYear: cycle.fiscalYear, stage: cycle.stage }, items: shown.slice(start, start + query.pageSize), total: shown.length, page: query.page, pageSize: query.pageSize,
      distribution: this.distribution(scale, rows), waitingCount: rows.filter((r) => r.managerScore === null).length,
    };
  }

  /** Sets one person's adjustment (calibration stage only). A person whose managers have not sent their evaluation cannot be calibrated. */
  async adjust(ctx: AccessContext, employeeId: string, input: AdjustCalibrationInput): Promise<CalibrationRowDto> {
    const cycle = await this.calibrationCycle();
    const evaluation = (await this.evaluations.forEmployees(cycle.id, [employeeId]))[0];
    if (!evaluation) throw new NotFoundError('Evaluation', employeeId);
    const before = (await this.calibrations.forEvaluations([evaluation.id]))[0]?.adjustment ?? 0;
    const row = (await this.rowsOf(cycle, [evaluation])).find((r) => r.employeeId === employeeId);
    if (!row || row.managerScore === null) throw new CalibrationWaitingError(1);
    await this.tx.run((tx) => this.calibrations.save({ evaluationId: evaluation.id, adjustment: input.adjustment, reason: input.adjustment === 0 ? null : input.reason, adjustedBy: ctx.userId }, tx));
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: PERFORMANCE_AUDIT.calibrationAdjusted, entityType: PERFORMANCE_EVALUATION_ENTITY, entityId: evaluation.id, changes: { from: before, to: input.adjustment } } satisfies AuditEvent);
    return (await this.rowsOf(cycle, [evaluation]))[0] as CalibrationRowDto;
  }

  /** Ends calibration and sends everything to approval; refused while someone has no sent manager evaluation. */
  async finish(ctx: AccessContext): Promise<void> {
    const cycle = await this.calibrationCycle();
    const waiting = (await this.rowsOf(cycle)).filter((r) => r.managerScore === null).length;
    if (waiting > 0) throw new CalibrationWaitingError(waiting);
    await this.cycleService.advance(ctx);
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: PERFORMANCE_AUDIT.calibrationFinished, entityType: 'performance_cycle', entityId: cycle.id } satisfies AuditEvent);
  }

  private async calibrationCycle(): Promise<CycleRow> {
    const cycle = await this.cycles.current();
    if (!cycle || cycle.stage !== 'cal') throw new CalibrationNotOpenError();
    return cycle;
  }

  private distribution(scale: readonly GradeBand[], rows: readonly CalibrationRowDto[]) {
    const ordered = [...scale].sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity));
    return ordered.map((band) => ({ levelName: band.name, count: rows.filter((r) => r.levelName === band.name).length }));
  }

  /** The rows of the given evaluations, or of every evaluation of the cycle. */
  private async rowsOf(cycle: CycleRow, only?: readonly EvaluationRow[]): Promise<CalibrationRowDto[]> {
    const names = new Map<string, Promise<{ nameAr: string; nameEn: string }>>();
    const scored = await this.scored(cycle, only);
    const rows = await Promise.all(scored.map(async (p) => {
      if (!names.has(p.person.titleId)) names.set(p.person.titleId, this.stages.titleNames(p.person.titleId));
      const title = await (names.get(p.person.titleId) as Promise<{ nameAr: string; nameEn: string }>);
      const calibrated = p.parts ? calibratedScore(p.parts.final, p.adjustment, p.template.cap) : null;
      return {
        employeeId: p.person.employeeId, name: p.person.name, titleNameAr: title.nameAr, titleNameEn: title.nameEn, managerName: p.person.managerName, stage: p.evaluation.stageNo,
        managerScore: p.parts?.final ?? null, adjustment: p.adjustment, reason: p.reason, calibrated, levelName: calibrated === null ? null : levelOf(cycle.snapshot.scale, calibrated)?.name ?? null,
      } satisfies CalibrationRowDto;
    }));
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Everyone of the cycle (or the given evaluations) with the sent manager review, its score parts and the calibration adjustment: the base of the list, the approval and the final result. */
  async scored(cycle: CycleRow, only?: readonly EvaluationRow[]): Promise<ScoredPerson[]> {
    const people = new Map((await this.roster.everyone()).map((p) => [p.employeeId, p]));
    const evaluations = (only ?? (await this.evaluations.forEmployees(cycle.id, [...people.keys()]))).filter((e) => people.has(e.employeeId));
    const ids = evaluations.map((e) => e.id);
    const [reviews, adjustments, catalog] = await Promise.all([this.evaluations.reviews(ids), this.calibrations.forEvaluations(ids), this.scores.catalogOf(cycle.id)]);
    const out: ScoredPerson[] = [];
    for (const evaluation of evaluations) {
      const template = cycle.snapshot.stages.find((s) => s.stage === evaluation.stageNo);
      if (!template) continue;
      const person = people.get(evaluation.employeeId) as RosterPerson;
      const review = sentReview(reviews.filter((r) => r.evaluationId === evaluation.id));
      const adj = adjustments.find((a) => a.evaluationId === evaluation.id);
      out.push({ evaluation, person, template, review, parts: review ? await this.scores.of({ employeeId: person.employeeId, titleId: person.titleId, template, catalog, form: review.content }) : null, adjustment: adj?.adjustment ?? 0, reason: adj?.reason ?? null });
    }
    return out;
  }
}
