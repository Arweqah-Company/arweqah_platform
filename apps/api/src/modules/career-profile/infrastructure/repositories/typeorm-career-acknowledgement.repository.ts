import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { CareerAcknowledgementRepository, type StoredAcknowledgement } from '../../domain/contracts/career-acknowledgement.repository';
import { CareerAckReopening, CareerAcknowledgement } from '../../domain/entities/career-acknowledgement.entities';

@Injectable()
export class TypeOrmCareerAcknowledgementRepository extends CareerAcknowledgementRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async latest(employeeId: string, titleId: string): Promise<StoredAcknowledgement | null> {
    const row = await this.m().findOne(CareerAcknowledgement, { where: { employeeId, titleId }, order: { acknowledgedAt: 'DESC' } });
    return row && { contentVersion: row.contentVersion, acknowledgedAt: row.acknowledgedAt };
  }

  countFor(employeeId: string): Promise<number> {
    return this.m().count(CareerAcknowledgement, { where: { employeeId } });
  }

  async latestReopening(titleId: string): Promise<Date | null> {
    const row = await this.m().findOne(CareerAckReopening, { where: { titleId }, order: { createdAt: 'DESC' } });
    return row?.createdAt ?? null;
  }

  async acknowledge(employeeId: string, titleId: string, contentVersion: number, tx: TransactionContext): Promise<void> {
    // The same person acknowledging the same version twice (two tabs) is one acknowledgement; a later one after a reopening is a new row.
    await this.m(tx).query(
      `INSERT INTO career_acknowledgements (employee_id, title_id, content_version, acknowledged_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (employee_id, title_id, content_version) DO UPDATE SET acknowledged_at = now()`,
      [employeeId, titleId, contentVersion],
    );
  }

  async reopen(titleId: string, reason: string, actorId: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).insert(CareerAckReopening, { titleId, reason, reopenedBy: actorId });
  }
}
