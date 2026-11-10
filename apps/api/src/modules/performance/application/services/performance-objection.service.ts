import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type MyResultDto, type ObjectionListDto, type RaiseObjectionInput, type RejectObjectionInput, type StageTemplate } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceEvaluationRepository } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceObjectionRepository, PerformanceResultRepository } from '../../domain/contracts/performance-result.repository';
import { PerformanceRosterPort } from '../../domain/contracts/performance-roster.port';
import { ObjectionExistsError, ObjectionItemInvalidError, ObjectionStateError, ObjectionWindowClosedError } from '../../domain/errors/performance.errors';
import { PERFORMANCE_AUDIT, PERFORMANCE_EVALUATION_ENTITY } from '../messages/performance.messages';
import { frozenResult } from './performance-approval.service';
import { PerformanceCalibrationService } from './performance-calibration.service';
import { objectionDto, PerformanceResultService } from './performance-result.service';

const EXTRA_REFS = ['init', 'growth', 'learning'];

/** The item an objection names must exist in the person's stage template. */
function itemExists(template: StageTemplate, input: RaiseObjectionInput): boolean {
  if (input.itemKind === 'criterion') return /^\d+$/.test(input.itemRef) && Number(input.itemRef) < template.criteria.length;
  if (input.itemKind === 'behaviour') return template.behaviours.some((b) => b.code === input.itemRef);
  return EXTRA_REFS.includes(input.itemRef);
}

/** The objection (FR-123): one per employee, raised within the window; the approval holder returns it to the manager or rejects it, then approves the revised evaluation. */
@Injectable()
export class PerformanceObjectionService {
  constructor(
    private readonly cycles: PerformanceCycleRepository,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly results: PerformanceResultRepository,
    private readonly objections: PerformanceObjectionRepository,
    private readonly view: PerformanceResultService,
    private readonly calibration: PerformanceCalibrationService,
    private readonly roster: PerformanceRosterPort,
    private readonly notifications: NotificationsService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** The employee raises their one objection against an item of their notified result. */
  async raise(ctx: AccessContext, input: RaiseObjectionInput): Promise<MyResultDto | null> {
    const cycle = await this.cycles.current();
    const person = await this.roster.person(ctx.userId);
    const evaluation = cycle && person ? await this.evaluations.find(cycle.id, person.employeeId) : null;
    if (!cycle || !evaluation) throw new NotFoundError('Evaluation', ctx.userId);
    const result = await this.results.find(evaluation.id);
    if (!this.view.visible(cycle, result) || !this.view.windowOpen(cycle, result)) throw new ObjectionWindowClosedError();
    const template = cycle.snapshot.stages.find((s) => s.stage === evaluation.stageNo);
    if (!template || !itemExists(template, input)) throw new ObjectionItemInvalidError();
    if (await this.objections.forEvaluation(evaluation.id)) throw new ObjectionExistsError();
    await this.tx.run((tx) => this.objections.create({ evaluationId: evaluation.id, ...input }, tx)).catch((error: unknown) => {
      if ((error as { driverError?: { code?: string } } | null)?.driverError?.code === '23505') throw new ObjectionExistsError();
      throw error;
    });
    this.audit(ctx, PERFORMANCE_AUDIT.objectionRaised, evaluation.id);
    return this.view.mine(cycle, evaluation);
  }

  /** The objections of the cycle in progress, newest first, with the employee's name. */
  async list(): Promise<ObjectionListDto> {
    const cycle = await this.cycles.current();
    if (!cycle) return { items: [] };
    const names = new Map((await this.roster.everyone()).map((p) => [p.employeeId, p.name]));
    return { items: (await this.objections.forCycle(cycle.id)).map((o) => ({ ...objectionDto(o), employeeId: o.employeeId, employeeName: names.get(o.employeeId) ?? '' })) };
  }

  /** Accepts the objection and hands the evaluation back to the manager. */
  async returnIt(ctx: AccessContext, id: string): Promise<void> {
    const found = await this.pending(id, 'open');
    await this.tx.run(async (tx) => {
      await this.moveOrFail(id, { from: 'open', to: 'returned', decidedBy: ctx.userId, decidedAt: this.clock.now() }, tx);
      await this.tell(found.employeeId, 'returned', tx);
    });
    this.audit(ctx, PERFORMANCE_AUDIT.objectionReturned, found.evaluationId);
  }

  /** Refuses the objection with a written reason. */
  async reject(ctx: AccessContext, id: string, input: RejectObjectionInput): Promise<void> {
    const found = await this.pending(id, 'open');
    await this.tx.run(async (tx) => {
      await this.moveOrFail(id, { from: 'open', to: 'rejected', decidedBy: ctx.userId, decisionReason: input.reason, decidedAt: this.clock.now() }, tx);
      await this.tell(found.employeeId, 'rejected', tx);
    });
    this.audit(ctx, PERFORMANCE_AUDIT.objectionRejected, found.evaluationId);
  }

  /** Approves the manager's revised evaluation: the result is replaced and the employee is told. */
  async finalize(ctx: AccessContext, id: string): Promise<void> {
    const found = await this.pending(id, 'reevaluated');
    const cycle = found.cycle;
    const evaluation = (await this.evaluations.forEmployees(cycle.id, [found.employeeId]))[0];
    const person = evaluation ? (await this.calibration.scored(cycle, [evaluation]))[0] : undefined;
    if (!person?.parts) throw new ObjectionStateError('no_evaluation');
    const now = this.clock.now();
    const fresh = frozenResult(person as never, { approvedBy: ctx.userId, approvedAt: now, objectionUntil: '', scale: cycle.snapshot.scale });
    await this.tx.run(async (tx) => {
      await this.moveOrFail(id, { from: 'reevaluated', to: 'finalized', decidedBy: ctx.userId, decidedAt: now }, tx);
      await this.results.replace(fresh.evaluationId, { finalScore: fresh.finalScore, levelName: fresh.levelName, breakdown: fresh.breakdown, approvedBy: ctx.userId, approvedAt: now }, tx);
      await this.tell(found.employeeId, 'finalized', tx);
    });
    this.audit(ctx, PERFORMANCE_AUDIT.objectionFinalized, found.evaluationId);
  }

  private async pending(id: string, status: 'open' | 'reevaluated'): Promise<{ evaluationId: string; employeeId: string; cycle: CycleRow }> {
    const found = await this.objections.byId(id);
    const cycle = await this.cycles.current();
    if (!found || !cycle || cycle.id !== found.cycleId) throw new NotFoundError('Objection', id);
    if (found.status !== status) throw new ObjectionStateError(found.status);
    return { evaluationId: found.evaluationId, employeeId: found.employeeId, cycle };
  }

  private async moveOrFail(id: string, step: Parameters<PerformanceObjectionRepository['move']>[1], tx: Parameters<PerformanceObjectionRepository['move']>[2]): Promise<void> {
    if (!(await this.objections.move(id, step, tx))) throw new ObjectionStateError('changed');
  }

  /** Tells the employee (and the direct manager when the evaluation comes back to them) what was decided. */
  private async tell(employeeId: string, outcome: 'returned' | 'rejected' | 'finalized', tx: Parameters<PerformanceObjectionRepository['move']>[2]): Promise<void> {
    const evaluation = (await this.roster.everyone()).find((p) => p.employeeId === employeeId);
    if (!evaluation) return;
    const words = {
      returned: { ar: 'قُبل اعتراضك وأُعيد تقييمك إلى مديرك المباشر.', en: 'Your objection was accepted and your evaluation went back to your direct manager.' },
      rejected: { ar: 'رُفض اعتراضك. تجد السبب في قسم «تقييم الأداء».', en: 'Your objection was rejected. The reason is in the «performance evaluation» section.' },
      finalized: { ar: 'أعاد مديرك التقييم وصار الاعتماد النهائي نتيجتك.', en: 'Your manager revised the evaluation and the final approval is now your result.' },
    }[outcome];
    await this.notifications.notify({ userIds: [evaluation.userId], tx, link: '/career-profile', titleAr: 'قرار في اعتراضك على نتيجة التقييم', titleEn: 'A decision on your objection to the evaluation result', bodyAr: words.ar, bodyEn: words.en });
    if (outcome === 'returned' && evaluation.managerUserId) {
      await this.notifications.notify({ userIds: [evaluation.managerUserId], tx, link: '/performance-team', titleAr: 'أُعيد إليك تقييم بسبب اعتراض', titleEn: 'An evaluation came back to you after an objection', bodyAr: `راجع تقييم ${evaluation.name} وأرسله من جديد.`, bodyEn: `Review the evaluation of ${evaluation.name} and send it again.` });
    }
  }

  private audit(ctx: AccessContext, action: string, evaluationId: string): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_EVALUATION_ENTITY, entityId: evaluationId } satisfies AuditEvent);
  }
}
