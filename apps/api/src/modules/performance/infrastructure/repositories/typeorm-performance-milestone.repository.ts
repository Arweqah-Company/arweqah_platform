import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { RecordMilestoneInput } from '@arweqah-platform/shared';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { PerformanceMilestoneRepository, type MilestoneRow } from '../../domain/contracts/performance-milestone.repository';
import { PerformanceMilestone } from '../../domain/entities/performance-milestones.entities';

@Injectable()
export class TypeOrmPerformanceMilestoneRepository extends PerformanceMilestoneRepository {
  constructor(
    @InjectRepository(PerformanceMilestone) private readonly milestones: Repository<PerformanceMilestone>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async forEvaluation(evaluationId: string): Promise<MilestoneRow[]> {
    return (await this.milestones.find({ where: { evaluationId } })).map((m) => ({
      evaluationId, milestoneKey: m.milestoneKey, whereWeAre: m.whereWeAre, obstacle: m.obstacle, agreedAction: m.agreedAction, note: m.note, recordedBy: m.recordedBy, recordedAt: m.updatedAt, acknowledgedAt: m.acknowledgedAt,
    }));
  }

  async save(evaluationId: string, key: string, input: RecordMilestoneInput, recordedBy: string, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(PerformanceMilestone).upsert({ evaluationId, milestoneKey: key, ...input, recordedBy, acknowledgedAt: null }, { conflictPaths: ['evaluationId', 'milestoneKey'] });
  }

  async acknowledge(evaluationId: string, key: string, at: Date, tx: TransactionContext): Promise<boolean> {
    const result = await managerOf(tx, this.ds.manager).getRepository(PerformanceMilestone).update({ evaluationId, milestoneKey: key }, { acknowledgedAt: at });
    return (result.affected ?? 0) > 0;
  }
}
