import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { PerformanceCalibrationRepository, type CalibrationRow } from '../../domain/contracts/performance-calibration.repository';
import { PerformanceCalibration } from '../../domain/entities/performance-results.entities';

const CHUNK = 1000;

@Injectable()
export class TypeOrmPerformanceCalibrationRepository extends PerformanceCalibrationRepository {
  constructor(
    @InjectRepository(PerformanceCalibration) private readonly calibrations: Repository<PerformanceCalibration>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async forEvaluations(evaluationIds: readonly string[]): Promise<CalibrationRow[]> {
    const rows: CalibrationRow[] = [];
    for (let i = 0; i < evaluationIds.length; i += CHUNK) {
      const found = await this.calibrations.find({ where: { evaluationId: In(evaluationIds.slice(i, i + CHUNK)) } });
      rows.push(...found.map((c) => ({ evaluationId: c.evaluationId, adjustment: c.adjustment, reason: c.reason })));
    }
    return rows;
  }

  async save(row: CalibrationRow & { adjustedBy: string }, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(PerformanceCalibration).upsert(row, { conflictPaths: ['evaluationId'] });
  }
}
