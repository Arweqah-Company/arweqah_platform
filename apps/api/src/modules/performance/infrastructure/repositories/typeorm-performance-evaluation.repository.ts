import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { SaveSelfEvaluationInput } from '@arweqah-platform/shared';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { PerformanceEvaluationRepository, type EvaluationRow, type SelfRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceEvaluation, PerformanceSelfEvaluation } from '../../domain/entities/performance-evaluations.entities';

const CHUNK = 500;

const toRow = (e: PerformanceEvaluation): EvaluationRow => ({ id: e.id, cycleId: e.cycleId, employeeId: e.employeeId, stageNo: e.stageNo, managerUserId: e.managerUserId });

@Injectable()
export class TypeOrmPerformanceEvaluationRepository extends PerformanceEvaluationRepository {
  constructor(
    @InjectRepository(PerformanceEvaluation) private readonly evaluations: Repository<PerformanceEvaluation>,
    @InjectRepository(PerformanceSelfEvaluation) private readonly selves: Repository<PerformanceSelfEvaluation>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async createMany(cycleId: string, rows: { employeeId: string; stageNo: number; managerUserId: string | null }[], tx: TransactionContext): Promise<void> {
    const repo = managerOf(tx, this.ds.manager).getRepository(PerformanceEvaluation);
    for (let i = 0; i < rows.length; i += CHUNK) {
      await repo.createQueryBuilder().insert().values(rows.slice(i, i + CHUNK).map((r) => ({ cycleId, ...r }))).orIgnore().execute();
    }
  }

  async find(cycleId: string, employeeId: string): Promise<EvaluationRow | null> {
    const row = await this.evaluations.findOne({ where: { cycleId, employeeId } });
    return row ? toRow(row) : null;
  }

  async self(evaluationId: string): Promise<SelfRow | null> {
    const row = await this.selves.findOne({ where: { evaluationId } });
    return row ? { content: row.content, sentAt: row.sentAt } : null;
  }

  async saveSelf(evaluationId: string, content: SaveSelfEvaluationInput, sentAt: Date | null, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(PerformanceSelfEvaluation).upsert({ evaluationId, content, sentAt }, { conflictPaths: ['evaluationId'] });
  }
}
