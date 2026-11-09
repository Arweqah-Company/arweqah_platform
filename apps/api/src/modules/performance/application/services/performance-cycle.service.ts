import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CYCLE_DATE_KEYS, type CatalogItemDto, type CatalogItemInput, type CycleDateKey, type CycleDto, type CycleStage, type CycleStateDto, type OpenCycleInput, type SetCycleDateInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { WorkflowEngine } from '../../../../core/workflow/application/workflow-engine';
import { PerformanceEvaluationService } from './performance-evaluation.service';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceTemplateRepository } from '../../domain/contracts/performance-template.repository';
import { CycleAlreadyOpenError, CycleDateInvalidError, CycleNotOpenError, CycleNotReadyError, CycleStageChangedError, CycleStageEndedError, CycleYearExistsError } from '../../domain/errors/performance.errors';
import { dateProblems, withDate } from '../../domain/rules/cycle-dates.rules';
import { cycleReadiness } from '../../domain/rules/cycle-readiness.rules';
import { CYCLE_KEY } from '../../domain/rules/cycle.machine';
import { PERFORMANCE_AUDIT, PERFORMANCE_CATALOG_ENTITY, PERFORMANCE_CYCLE_ENTITY } from '../messages/performance.messages';

const NEXT: Partial<Record<CycleStage, CycleStage>> = { self: 'mgr', mgr: 'cal', cal: 'appr', appr: 'notif', notif: 'obj' };

/** The conflict the database caught when two opens ran together: a second open cycle, or a second cycle of the same year. */
function uniqueViolation(error: unknown, fiscalYear: number): Error | null {
  const driver = (error as { driverError?: { code?: string; constraint?: string } } | null)?.driverError;
  if (driver?.code !== '23505') return null;
  if (driver.constraint === 'UQ_performance_cycles_open') return new CycleAlreadyOpenError();
  return driver.constraint === 'UQ_performance_cycles_year' ? new CycleYearExistsError(fiscalYear) : null;
}

const toDto = (c: CycleRow): CycleDto => ({ id: c.id, fiscalYear: c.fiscalYear, stage: c.stage, openedAt: c.openedAt.toISOString(), closedAt: c.closedAt ? c.closedAt.toISOString() : null, dates: c.dates });

/** The evaluation cycle (FR-118): its state with the readiness list and the catalog, opening it with a snapshot of the templates, moving it on, closing it, and its dates. */
@Injectable()
export class PerformanceCycleService {
  constructor(
    private readonly cycles: PerformanceCycleRepository,
    private readonly templates: PerformanceTemplateRepository,
    private readonly evaluations: PerformanceEvaluationService,
    private readonly workflow: WorkflowEngine,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async state(): Promise<CycleStateDto> {
    const cycle = await this.cycles.current();
    const open = cycle && cycle.stage !== 'closed' ? cycle : null;
    const catalog = await this.cycles.catalog(open?.id ?? null);
    return { cycle: cycle ? toDto(cycle) : null, readiness: await this.readiness(catalog.length), catalog };
  }

  /** Opens the cycle of a fiscal year with a snapshot of the templates; refused while another cycle is open, for a year that has one, or while the evaluation file is incomplete. */
  async open(ctx: AccessContext, input: OpenCycleInput): Promise<CycleStateDto> {
    const current = await this.cycles.current();
    if (current && current.stage !== 'closed') throw new CycleAlreadyOpenError();
    if (await this.cycles.yearExists(input.fiscalYear)) throw new CycleYearExistsError(input.fiscalYear);
    const [stages, scale, fiscal] = await Promise.all([this.templates.stages(), this.templates.scale(), this.templates.fiscal()]);
    const waiting = await this.cycles.catalog(null);
    const readiness = cycleReadiness(stages, scale, fiscal, waiting.length);
    if (!readiness.ready) throw new CycleNotReadyError(readiness);
    await this.tx.run(async (tx) => {
      const row = await this.cycles.insert({ fiscalYear: input.fiscalYear, openedBy: ctx.userId, openedAt: this.clock.now(), snapshot: { stages, scale: scale ?? [], fiscal: fiscal ?? { months: [], notes: [] } } }, tx);
      await this.cycles.adoptWaiting(row.id, tx);
      await this.evaluations.openFor(row.id, tx);
      await this.workflow.start({ definitionKey: CYCLE_KEY, entityType: PERFORMANCE_CYCLE_ENTITY, entityId: row.id, actorId: ctx.userId, tx });
    }).catch((error: unknown) => { throw uniqueViolation(error, input.fiscalYear) ?? error; });
    this.audit(ctx, PERFORMANCE_AUDIT.cycleOpened, { fiscalYear: input.fiscalYear });
    return this.state();
  }

  /** Moves the cycle to the next stage (the last stage, the objections, is closed, not advanced). */
  async advance(ctx: AccessContext): Promise<CycleStateDto> {
    const cycle = await this.openCycle();
    const next = NEXT[cycle.stage];
    if (!next) throw new CycleStageEndedError();
    await this.move(ctx, cycle, { event: 'NEXT', stage: next, by: null });
    this.audit(ctx, PERFORMANCE_AUDIT.cycleAdvanced, { fiscalYear: cycle.fiscalYear, from: cycle.stage, to: next });
    return this.state();
  }

  async close(ctx: AccessContext): Promise<CycleStateDto> {
    const cycle = await this.openCycle();
    await this.move(ctx, cycle, { event: 'CLOSE', stage: 'closed', by: { userId: ctx.userId, at: this.clock.now() } });
    this.audit(ctx, PERFORMANCE_AUDIT.cycleClosed, { fiscalYear: cycle.fiscalYear, from: cycle.stage });
    return this.state();
  }

  /** Sets one date of the cycle; it must fit the others (422 with the problems when it does not). */
  async setDate(ctx: AccessContext, key: CycleDateKey, input: SetCycleDateInput): Promise<CycleStateDto> {
    const cycle = await this.openCycle();
    const next = { key, from: input.from, to: input.to };
    const problems = dateProblems(cycle.dates, next);
    if (problems.length) throw new CycleDateInvalidError(problems);
    await this.tx.run((tx) => this.cycles.setDates(cycle.id, withDate(cycle.dates, next, CYCLE_DATE_KEYS), tx));
    this.audit(ctx, PERFORMANCE_AUDIT.cycleDateSet, { fiscalYear: cycle.fiscalYear, key, from: input.from, to: input.to });
    return this.state();
  }

  /** Adds an item to the catalog of the cycle in progress (or of the next one when none is open). */
  async addItem(ctx: AccessContext, item: CatalogItemInput): Promise<CatalogItemDto> {
    const cycleId = await this.catalogOwner();
    const saved = await this.tx.run((tx) => this.cycles.addItem(cycleId, item, tx));
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: PERFORMANCE_AUDIT.catalogAdded, entityType: PERFORMANCE_CATALOG_ENTITY, entityId: saved.id, changes: { kind: item.kind, points: item.points } } satisfies AuditEvent);
    return saved;
  }

  async removeItem(ctx: AccessContext, id: string): Promise<void> {
    const cycleId = await this.catalogOwner();
    if (!(await this.tx.run((tx) => this.cycles.removeItem(id, cycleId, tx)))) throw new NotFoundError('Catalog item', id);
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: PERFORMANCE_AUDIT.catalogRemoved, entityType: PERFORMANCE_CATALOG_ENTITY, entityId: id } satisfies AuditEvent);
  }

  private async catalogOwner(): Promise<string | null> {
    const cycle = await this.cycles.current();
    return cycle && cycle.stage !== 'closed' ? cycle.id : null;
  }

  private async openCycle(): Promise<CycleRow> {
    const cycle = await this.cycles.current();
    if (!cycle || cycle.stage === 'closed') throw new CycleNotOpenError();
    return cycle;
  }

  private async move(ctx: AccessContext, cycle: CycleRow, step: { event: 'NEXT' | 'CLOSE'; stage: CycleStage; by: { userId: string; at: Date } | null }): Promise<void> {
    const instance = await this.workflow.findByEntity(PERFORMANCE_CYCLE_ENTITY, cycle.id);
    if (!instance || instance.isDone) throw new CycleNotOpenError();
    await this.tx.run(async (tx) => {
      if (!(await this.cycles.setStage(cycle.id, { from: cycle.stage, to: step.stage }, step.by, tx))) throw new CycleStageChangedError();
      await this.workflow.send({ instanceId: instance.id, event: { type: step.event }, actorId: ctx.userId, tx });
    });
  }

  private async readiness(catalogItems: number) {
    const [stages, scale, fiscal] = await Promise.all([this.templates.stages(), this.templates.scale(), this.templates.fiscal()]);
    return cycleReadiness(stages, scale, fiscal, catalogItems);
  }

  private audit(ctx: AccessContext, action: string, changes: Record<string, unknown>): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_CYCLE_ENTITY, entityId: null, changes } satisfies AuditEvent);
  }
}
