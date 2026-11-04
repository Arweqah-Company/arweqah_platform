import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { AssignmentField } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeAssignment } from '../../domain/entities/employee-assignment.entity';
import { EmployeeAssignmentRepository, type AssignmentValues, type PeopleNames } from '../../domain/contracts/employee-assignment.repository';

@Injectable()
export class TypeOrmEmployeeAssignmentRepository extends EmployeeAssignmentRepository {
  constructor(
    @InjectRepository(EmployeeAssignment) private readonly repo: Repository<EmployeeAssignment>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  private rows(tx?: TransactionContext): Repository<EmployeeAssignment> {
    return managerOf(tx, this.ds.manager).getRepository(EmployeeAssignment);
  }

  history(employeeId: string, field?: AssignmentField, tx?: TransactionContext): Promise<EmployeeAssignment[]> {
    return this.rows(tx).find({ where: field ? { employeeId, field } : { employeeId }, order: { validFrom: 'ASC', createdAt: 'ASC' } });
  }

  async peopleNames(managerIds: string[], userIds: string[]): Promise<PeopleNames> {
    const employees = managerIds.length ? await this.ds.getRepository(Employee).find({ select: { id: true, fullName: true, fullNameEn: true }, where: { id: In(managerIds) } }) : [];
    const users = userIds.length ? await this.ds.createQueryBuilder().select(['u.id AS id', 'u.name AS name']).from('users', 'u').where('u.id IN (:...userIds)', { userIds }).getRawMany<{ id: string; name: string }>() : [];
    return {
      managers: new Map(employees.map((e) => [e.id, { nameAr: e.fullName, nameEn: e.fullNameEn ?? e.fullName }])),
      users: new Map(users.map((u) => [u.id, u.name])),
    };
  }

  findById(id: string): Promise<EmployeeAssignment | null> {
    return this.repo.findOne({ where: { id } });
  }

  async lockEmployee(employeeId: string, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(Employee).createQueryBuilder('e').select('e.id').where('e.id = :employeeId', { employeeId }).setLock('pessimistic_write').getOne();
  }

  async insert(rows: Partial<EmployeeAssignment>[], tx: TransactionContext): Promise<EmployeeAssignment[]> {
    const repo = this.rows(tx);
    return repo.save(rows.map((row) => repo.create(row)));
  }

  async overwrite(id: string, values: AssignmentValues, tx: TransactionContext): Promise<void> {
    await this.rows(tx).update({ id }, values);
  }

  async close(id: string, validTo: string | null, tx: TransactionContext): Promise<void> {
    await this.rows(tx).update({ id }, { validTo });
  }

  async remove(id: string, tx: TransactionContext): Promise<void> {
    await this.rows(tx).delete({ id });
  }

  async markApplied(id: string, at: Date, tx: TransactionContext): Promise<void> {
    await this.rows(tx).update({ id }, { appliedAt: at });
  }

  due(today: string): Promise<EmployeeAssignment[]> {
    return this.repo
      .createQueryBuilder('a')
      .innerJoin(Employee, 'e', 'e.id = a.employee_id AND e.deleted_at IS NULL')
      .where('a.applied_at IS NULL AND a.valid_from <= :today', { today })
      .orderBy('a.valid_from', 'ASC')
      .addOrderBy('a.created_at', 'ASC')
      .getMany();
  }
}
