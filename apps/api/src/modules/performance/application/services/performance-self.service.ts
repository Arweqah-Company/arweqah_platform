import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { type MyEvaluationDto, type SaveSelfEvaluationInput, type SelfEvaluationDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { Clock } from '../../../../common/application/clock';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceEvaluationRepository, type EvaluationRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceRosterPort, PerformanceStagePort, type RosterPerson } from '../../domain/contracts/performance-roster.port';
import { SelfEvaluationClosedError, SelfEvaluationInvalidError } from '../../domain/errors/performance.errors';
import { cleanSelf, emptySelf, selfEditable, selfProblems } from '../../domain/rules/self-evaluation.rules';
import { PERFORMANCE_AUDIT, PERFORMANCE_EVALUATION_ENTITY } from '../messages/performance.messages';
import { PerformanceEvaluationService } from './performance-evaluation.service';

interface Mine {
  person: RosterPerson;
  cycle: CycleRow;
  evaluation: EvaluationRow;
}

/** The employee's own self-evaluation (FR-119): reading it with the template of their stage, keeping a draft, and sending it (the manager is told the first time). */
@Injectable()
export class PerformanceSelfService {
  constructor(
    private readonly roster: PerformanceRosterPort,
    private readonly stages: PerformanceStagePort,
    private readonly cycles: PerformanceCycleRepository,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly made: PerformanceEvaluationService,
    private readonly notifications: NotificationsService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** The tab «my evaluation»: where the cycle is and, when the person has an evaluation in it, the template of their stage and what they wrote. */
  async mine(ctx: AccessContext): Promise<MyEvaluationDto> {
    const cycle = await this.cycles.current();
    const person = await this.roster.person(ctx.userId);
    const evaluation = cycle && person ? await this.made.ensure(cycle.id, person, cycle.stage !== 'closed', (work) => this.tx.run(work)) : null;
    const head = cycle ? { fiscalYear: cycle.fiscalYear, stage: cycle.stage, selfDeadline: cycle.dates.find((d) => d.key === 'self_deadline')?.from ?? null } : null;
    return { cycle: head, evaluation: cycle && person && evaluation ? await this.view({ person, cycle, evaluation }) : null };
  }

  /** Keeps the form. Before the first send it is a draft (anything goes); after it, the form must stay complete. */
  async save(ctx: AccessContext, input: SaveSelfEvaluationInput): Promise<MyEvaluationDto> {
    const mine = await this.open(ctx);
    const catalog = await this.cycles.catalog(mine.cycle.id);
    const content = cleanSelf(input, catalog);
    const before = await this.evaluations.self(mine.evaluation.id);
    if (before?.sentAt) this.assertComplete(mine, input, catalog); // a sent form is checked as it came: a wrong pick is an error, not silently dropped
    await this.tx.run((tx) => this.evaluations.saveSelf(mine.evaluation.id, content, before?.sentAt ?? null, tx));
    if (before?.sentAt) this.audit(ctx, PERFORMANCE_AUDIT.selfEdited, mine.evaluation.id);
    return this.mine(ctx);
  }

  /** Sends the form: it must be complete. The first send tells the direct manager; a later one is an edit. */
  async send(ctx: AccessContext, input: SaveSelfEvaluationInput): Promise<MyEvaluationDto> {
    const mine = await this.open(ctx);
    const catalog = await this.cycles.catalog(mine.cycle.id);
    const content = cleanSelf(input, catalog);
    this.assertComplete(mine, input, catalog);
    const before = await this.evaluations.self(mine.evaluation.id);
    const first = !before?.sentAt;
    await this.tx.run(async (tx) => {
      await this.evaluations.saveSelf(mine.evaluation.id, content, before?.sentAt ?? this.clock.now(), tx);
      if (first && mine.evaluation.managerUserId) {
        await this.notifications.notify({
          userIds: [mine.evaluation.managerUserId], tx, coalesce: true,
          titleAr: 'تقييم ذاتي بانتظار مراجعتك', titleEn: 'A self-evaluation is waiting for your review',
          bodyAr: `${mine.person.name} أرسل تقييمه الذاتي.`, bodyEn: `${mine.person.name} sent their self-evaluation.`,
        });
      }
    });
    this.audit(ctx, first ? PERFORMANCE_AUDIT.selfSent : PERFORMANCE_AUDIT.selfEdited, mine.evaluation.id);
    return this.mine(ctx);
  }

  /** The person's evaluation in the cycle in progress, while it can still be changed (404 when they have none, 409 when it is closed to changes). */
  private async open(ctx: AccessContext): Promise<Mine> {
    const cycle = await this.cycles.current();
    const person = await this.roster.person(ctx.userId);
    if (!cycle || !person) throw new NotFoundError('Evaluation', ctx.userId);
    const evaluation = await this.made.ensure(cycle.id, person, cycle.stage !== 'closed', (work) => this.tx.run(work));
    if (!evaluation) throw new NotFoundError('Evaluation', ctx.userId);
    if (!selfEditable(cycle.stage, await this.evaluations.directStarted(evaluation.id))) throw new SelfEvaluationClosedError();
    return { person, cycle, evaluation };
  }

  private assertComplete(mine: Mine, content: SaveSelfEvaluationInput, catalog: Awaited<ReturnType<PerformanceCycleRepository['catalog']>>): void {
    const template = mine.cycle.snapshot.stages.find((s) => s.stage === mine.evaluation.stageNo);
    if (!template) throw new NotFoundError('Template', String(mine.evaluation.stageNo));
    const problems = selfProblems(template, content, catalog);
    if (problems.length) throw new SelfEvaluationInvalidError(problems);
  }

  private async view({ person, cycle, evaluation }: Mine): Promise<MyEvaluationDto['evaluation']> {
    const template = cycle.snapshot.stages.find((s) => s.stage === evaluation.stageNo);
    if (!template) return null;
    const [self, catalog, minutes, stage] = await Promise.all([this.evaluations.self(evaluation.id), this.cycles.catalog(cycle.id), this.roster.approvedLearningMinutes(person.employeeId), this.stages.stageOf(person.titleId)]);
    const dto: SelfEvaluationDto = { ...(self?.content ?? emptySelf()), sentAt: self?.sentAt ? self.sentAt.toISOString() : null };
    return {
      stage: evaluation.stageNo, stageName: template.name, template, scale: cycle.snapshot.scale, fiscal: cycle.snapshot.fiscal, catalog, self: dto,
      editable: selfEditable(cycle.stage, await this.evaluations.directStarted(evaluation.id)), managerName: person.managerName, learning: { approvedMinutes: minutes, stageMinutes: (stage?.hoursPerYear ?? 0) * 60 },
    };
  }

  private audit(ctx: AccessContext, action: string, evaluationId: string): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_EVALUATION_ENTITY, entityId: evaluationId } satisfies AuditEvent);
  }
}
