import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { OBJECTION_PENDING, type PerformanceObjectionStatus, type ResultBreakdown } from '@arweqah-platform/shared';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { PerformanceObjectionRepository, PerformanceResultRepository, type ObjectionRecord, type ResultRow } from '../../domain/contracts/performance-result.repository';
import { PerformanceEvaluation } from '../../domain/entities/performance-evaluations.entities';
import { PerformanceObjection, PerformanceResult } from '../../domain/entities/performance-results.entities';

const CHUNK = 500;

const toResult = (r: PerformanceResult): ResultRow => ({ evaluationId: r.evaluationId, finalScore: r.finalScore, levelName: r.levelName, breakdown: r.breakdown, approvedBy: r.approvedBy, approvedAt: r.approvedAt, notifiedAt: r.notifiedAt, objectionUntil: r.objectionUntil });
const toObjection = (o: PerformanceObjection): ObjectionRecord => ({ id: o.id, evaluationId: o.evaluationId, itemKind: o.itemKind, itemRef: o.itemRef, reason: o.reason, status: o.status as PerformanceObjectionStatus, decisionReason: o.decisionReason, createdAt: o.createdAt, decidedAt: o.decidedAt });

@Injectable()
export class TypeOrmPerformanceResultRepository extends PerformanceResultRepository {
  constructor(
    @InjectRepository(PerformanceResult) private readonly results: Repository<PerformanceResult>,
    @InjectRepository(PerformanceEvaluation) private readonly evaluations: Repository<PerformanceEvaluation>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async find(evaluationId: string): Promise<ResultRow | null> {
    const row = await this.results.findOne({ where: { evaluationId } });
    return row ? toResult(row) : null;
  }

  async freeze(rows: readonly ResultRow[], tx: TransactionContext): Promise<void> {
    const repo = managerOf(tx, this.ds.manager).getRepository(PerformanceResult);
    for (let i = 0; i < rows.length; i += CHUNK) await repo.upsert(rows.slice(i, i + CHUNK).map((r) => ({ ...r })), { conflictPaths: ['evaluationId'] });
  }

  async replace(evaluationId: string, patch: { finalScore: number; levelName: string | null; breakdown: ResultBreakdown; approvedBy: string; approvedAt: Date }, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(PerformanceResult).update({ evaluationId }, patch);
  }

  async countForCycle(cycleId: string): Promise<number> {
    const ids = (await this.evaluations.find({ where: { cycleId }, select: { id: true } })).map((e) => e.id);
    return ids.length ? this.results.count({ where: { evaluationId: In(ids) } }) : 0;
  }
}

@Injectable()
export class TypeOrmPerformanceObjectionRepository extends PerformanceObjectionRepository {
  constructor(
    @InjectRepository(PerformanceObjection) private readonly objections: Repository<PerformanceObjection>,
    @InjectRepository(PerformanceEvaluation) private readonly evaluations: Repository<PerformanceEvaluation>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async forEvaluation(evaluationId: string): Promise<ObjectionRecord | null> {
    const row = await this.objections.findOne({ where: { evaluationId } });
    return row ? toObjection(row) : null;
  }

  async byId(id: string): Promise<(ObjectionRecord & { cycleId: string; employeeId: string }) | null> {
    const row = await this.objections.findOne({ where: { id } });
    const evaluation = row ? await this.evaluations.findOne({ where: { id: row.evaluationId } }) : null;
    return row && evaluation ? { ...toObjection(row), cycleId: evaluation.cycleId, employeeId: evaluation.employeeId } : null;
  }

  async forCycle(cycleId: string): Promise<(ObjectionRecord & { employeeId: string })[]> {
    const evaluations = await this.evaluations.find({ where: { cycleId } });
    if (!evaluations.length) return [];
    const rows: PerformanceObjection[] = [];
    for (let i = 0; i < evaluations.length; i += CHUNK) rows.push(...(await this.objections.find({ where: { evaluationId: In(evaluations.slice(i, i + CHUNK).map((e) => e.id)) } })));
    const employeeOf = new Map(evaluations.map((e) => [e.id, e.employeeId]));
    return rows.map((o) => ({ ...toObjection(o), employeeId: employeeOf.get(o.evaluationId) as string })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(row: { evaluationId: string; itemKind: string; itemRef: string; reason: string }, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(PerformanceObjection).insert({ ...row, status: 'open' });
  }

  async move(id: string, step: { from: PerformanceObjectionStatus; to: PerformanceObjectionStatus; decidedBy?: string; decisionReason?: string | null; decidedAt?: Date }, tx: TransactionContext): Promise<boolean> {
    const result = await managerOf(tx, this.ds.manager).getRepository(PerformanceObjection).update({ id, status: step.from }, { status: step.to, decidedBy: step.decidedBy ?? null, decisionReason: step.decisionReason ?? null, decidedAt: step.decidedAt ?? null });
    return (result.affected ?? 0) > 0;
  }

  async markReevaluated(evaluationId: string, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(PerformanceObjection).update({ evaluationId, status: 'returned' }, { status: 'reevaluated' });
  }

  async pendingCount(cycleId: string): Promise<number> {
    const ids = (await this.evaluations.find({ where: { cycleId }, select: { id: true } })).map((e) => e.id);
    if (!ids.length) return 0;
    let total = 0;
    for (let i = 0; i < ids.length; i += CHUNK) total += await this.objections.count({ where: { evaluationId: In(ids.slice(i, i + CHUNK)), status: In([...OBJECTION_PENDING]) } });
    return total;
  }
}
