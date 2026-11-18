import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { EmployeeBasicRequestRepository } from '../../domain/contracts/employee-basic-request.repository';
import { EmployeeBasicRequest } from '../../domain/entities/employee-basic-request.entity';

@Injectable()
export class TypeOrmEmployeeBasicRequestRepository extends EmployeeBasicRequestRepository {
  constructor(
    @InjectRepository(EmployeeBasicRequest) private readonly repo: Repository<EmployeeBasicRequest>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  latest(employeeId: string): Promise<EmployeeBasicRequest | null> {
    return this.repo.findOne({ where: { employeeId }, order: { submittedAt: 'DESC', createdAt: 'DESC' } });
  }

  pending(employeeId: string): Promise<EmployeeBasicRequest | null> {
    return this.repo.findOne({ where: { employeeId, status: 'pending' } });
  }

  async insert(values: { employeeId: string; changes: EmployeeBasicRequest['changes']; submittedAt: Date }, tx: TransactionContext): Promise<EmployeeBasicRequest> {
    const repo = managerOf(tx, this.ds.manager).getRepository(EmployeeBasicRequest);
    return repo.save(repo.create({ ...values, status: 'pending' }));
  }

  async settle(id: string, to: Parameters<EmployeeBasicRequestRepository['settle']>[1], tx: TransactionContext): Promise<boolean> {
    const result = await managerOf(tx, this.ds.manager)
      .getRepository(EmployeeBasicRequest)
      .update({ id, status: 'pending' }, { status: to.status, decidedBy: to.decidedBy, decidedAt: to.decidedAt, rejectionReason: to.rejectionReason ?? null });
    return (result.affected ?? 0) > 0;
  }
}
