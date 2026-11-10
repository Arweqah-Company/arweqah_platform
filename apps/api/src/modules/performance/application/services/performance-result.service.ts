import { Injectable } from '@nestjs/common';
import { riyadhToday, type CycleStage, type MyResultDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import type { EvaluationRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceObjectionRepository, PerformanceResultRepository, type ObjectionRecord, type ResultRow } from '../../domain/contracts/performance-result.repository';

/** The stages in which the employee is told the result (and may object). */
export const RESULT_STAGES: readonly CycleStage[] = ['notif', 'obj', 'closed'];
const OBJECTION_STAGES: readonly CycleStage[] = ['notif', 'obj'];

export const objectionDto = (o: ObjectionRecord) => ({ id: o.id, itemKind: o.itemKind as never, itemRef: o.itemRef, reason: o.reason, status: o.status, decisionReason: o.decisionReason, createdAt: o.createdAt.toISOString(), decidedAt: o.decidedAt ? o.decidedAt.toISOString() : null });

/** What the employee may see of their own result: nothing before the individual notification (the server leaves it out, the screen does not hide it), the frozen result after it. */
@Injectable()
export class PerformanceResultService {
  constructor(
    private readonly results: PerformanceResultRepository,
    private readonly objections: PerformanceObjectionRepository,
    private readonly cycles: PerformanceCycleRepository,
    private readonly clock: Clock,
  ) {}

  /** The result is visible: the cycle is past approval and the person was told. */
  visible(cycle: CycleRow, result: ResultRow | null): result is ResultRow {
    return !!result && !!result.notifiedAt && RESULT_STAGES.includes(cycle.stage);
  }

  /** An objection can be raised now: in the notification or objection stage, within the five working days. */
  windowOpen(cycle: CycleRow, result: ResultRow): boolean {
    return OBJECTION_STAGES.includes(cycle.stage) && (!result.objectionUntil || riyadhToday(this.clock.now()) <= result.objectionUntil);
  }

  async mine(cycle: CycleRow, evaluation: EvaluationRow): Promise<MyResultDto | null> {
    const result = await this.results.find(evaluation.id);
    if (!this.visible(cycle, result)) return null;
    const template = cycle.snapshot.stages.find((s) => s.stage === evaluation.stageNo);
    if (!template) return null;
    const [objection, catalog] = await Promise.all([this.objections.forEvaluation(evaluation.id), this.cycles.catalog(cycle.id)]);
    return {
      finalScore: result.finalScore, levelName: result.levelName, breakdown: result.breakdown, template, scale: cycle.snapshot.scale, catalog,
      notifiedAt: (result.notifiedAt as Date).toISOString(), objectionUntil: result.objectionUntil, objection: objection ? objectionDto(objection) : null, canObject: !objection && this.windowOpen(cycle, result),
    };
  }
}
