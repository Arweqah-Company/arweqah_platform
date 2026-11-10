import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { addWorkingDays, calibratedScore, levelOf, OBJECTION_WORKING_DAYS, riyadhToday } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { PerformanceCycleRepository } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceResultRepository, type ResultRow } from '../../domain/contracts/performance-result.repository';
import { ApprovalNotOpenError, CalibrationWaitingError } from '../../domain/errors/performance.errors';
import { PERFORMANCE_AUDIT } from '../messages/performance.messages';
import { PerformanceCalibrationService, type ScoredPerson } from './performance-calibration.service';
import { PerformanceCycleService } from './performance-cycle.service';

/** The frozen result of one person: the calibrated score, its level and the whole breakdown. */
export function frozenResult(p: ScoredPerson & { parts: NonNullable<ScoredPerson['parts']> }, ctx: { approvedBy: string; approvedAt: Date; objectionUntil: string; scale: Parameters<typeof levelOf>[0] }): ResultRow {
  const finalScore = calibratedScore(p.parts.final, p.adjustment, p.template.cap);
  return {
    evaluationId: p.evaluation.id, finalScore, levelName: levelOf(ctx.scale, finalScore)?.name ?? null,
    breakdown: { parts: p.parts, form: (p.review as NonNullable<ScoredPerson['review']>).content, managerScore: p.parts.final, adjustment: p.adjustment, reason: p.reason },
    approvedBy: ctx.approvedBy, approvedAt: ctx.approvedAt, notifiedAt: ctx.approvedAt, objectionUntil: ctx.objectionUntil,
  };
}

/** Approval (FR-122): freezes every result, tells everyone individually (the cycle moves to the notification stage) and starts the objection window. */
@Injectable()
export class PerformanceApprovalService {
  constructor(
    private readonly cycles: PerformanceCycleRepository,
    private readonly cycleService: PerformanceCycleService,
    private readonly calibration: PerformanceCalibrationService,
    private readonly results: PerformanceResultRepository,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async approve(ctx: AccessContext): Promise<void> {
    const cycle = await this.cycles.current();
    if (!cycle || cycle.stage !== 'appr') throw new ApprovalNotOpenError();
    const scored = await this.calibration.scored(cycle);
    const waiting = scored.filter((p) => !p.parts).length;
    if (waiting > 0) throw new CalibrationWaitingError(waiting);
    const now = this.clock.now();
    const frame = { approvedBy: ctx.userId, approvedAt: now, objectionUntil: addWorkingDays(riyadhToday(now), OBJECTION_WORKING_DAYS), scale: cycle.snapshot.scale };
    await this.tx.run((tx) => this.results.freeze(scored.map((p) => frozenResult(p as never, frame)), tx));
    await this.cycleService.advance(ctx);
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: PERFORMANCE_AUDIT.resultsApproved, entityType: 'performance_cycle', entityId: cycle.id, changes: { people: scored.length } } satisfies AuditEvent);
  }
}
