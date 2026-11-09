import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { CareerCompetencyRepository } from '../../domain/contracts/career-competency.repository';
import { CareerEmployeeCompetencyLevel } from '../../domain/entities/career-requests.entities';
import type { CompetencyLevelRow } from '../../domain/types/career-profile.types';

@Injectable()
export class TypeOrmCareerCompetencyRepository extends CareerCompetencyRepository {
  constructor(
    @InjectRepository(CareerEmployeeCompetencyLevel) private readonly levels: Repository<CareerEmployeeCompetencyLevel>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async forEmployee(employeeId: string): Promise<CompetencyLevelRow[]> {
    const rows = await this.levels.find({ where: { employeeId } });
    return rows.map((r) => ({ employeeId: r.employeeId, competency: r.competency, level: r.level, reachedAt: r.reachedAt }));
  }

  async set(write: { employeeId: string; competency: string; level: string | null; recordedBy: string; at: Date }, tx: TransactionContext): Promise<void> {
    const repo = managerOf(tx, this.ds.manager).getRepository(CareerEmployeeCompetencyLevel);
    const { employeeId, competency } = write;
    if (write.level === null) {
      await repo.delete({ employeeId, competency });
      return;
    }
    const before = await repo.findOne({ where: { employeeId, competency } });
    await repo.save(Object.assign(before ?? new CareerEmployeeCompetencyLevel(), { employeeId, competency, level: write.level, reachedAt: write.at, recordedBy: write.recordedBy }));
  }
}
