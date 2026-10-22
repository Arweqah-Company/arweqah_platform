import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository, type SelectQueryBuilder } from 'typeorm';
import type { EmployeesQuery, EmployeesSummaryDto, ManagerOptionDto } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import { applyScope } from '../../../../core/access/infrastructure/scope-query';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { EmployeeValues } from '../../domain/types/employee.types';
import { EmployeeEmailTakenError, EmployeeNumberTakenError, IdDocumentTakenError, InvalidReferenceError } from '../../domain/errors/employee.errors';
import { escapeLike } from '../../../../common/infrastructure/sql-like';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const MANAGER_RESULTS = 20;

/** Search text is matched literally, never as a LIKE pattern. */

@Injectable()
export class TypeOrmEmployeeRepository extends EmployeeRepository {
  constructor(
    @InjectRepository(Employee) private readonly repo: Repository<Employee>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  findById(id: string): Promise<Employee | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByUserId(userId: string): Promise<Employee | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async list(query: EmployeesQuery, scope: ScopeFilter): Promise<{ items: Employee[]; total: number }> {
    const qb = this.repo.createQueryBuilder('e').orderBy('e.full_name', 'ASC').addOrderBy('e.id', 'ASC').skip((query.page - 1) * query.pageSize).take(query.pageSize);
    applyScope(qb, scope, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    this.applyFilters(qb, query);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  private applyFilters(qb: SelectQueryBuilder<Employee>, query: EmployeesQuery): void {
    if (query.companyId) qb.andWhere('e.company_id = :companyId', { companyId: query.companyId });
    if (query.orgNodeId) qb.andWhere('e.org_node_id = :orgNodeId', { orgNodeId: query.orgNodeId });
    if (query.relationTypeId) qb.andWhere('e.relation_type_id = :relationTypeId', { relationTypeId: query.relationTypeId });
    this.applyAttributeFilters(qb, query);
    if (query.search) {
      qb.andWhere('(e.full_name ILIKE :term OR e.employee_number ILIKE :term OR e.work_email ILIKE :term OR e.full_name_en ILIKE :term)', { term: `%${escapeLike(query.search)}%` });
    }
    if (query.status === 'needs-placement') qb.andWhere('e.is_system_account = false AND (e.org_node_id IS NULL OR e.job_title_id IS NULL)');
    if (query.status === 'active' || query.status === 'inactive') {
      qb.andWhere(`${query.status === 'inactive' ? 'NOT ' : ''}EXISTS (SELECT 1 FROM users u WHERE u.id = e.user_id AND u.is_active)`);
    }
  }

  /** Every attribute the list can be filtered by; dates use the same 30-day window as the "needs attention" flags. */
  private applyAttributeFilters(qb: SelectQueryBuilder<Employee>, query: EmployeesQuery): void {
    const equals: [keyof EmployeesQuery, string][] = [
      ['jobTitleId', 'job_title_id'], ['contractTypeId', 'contract_type_id'], ['nationalityId', 'nationality_id'], ['maritalStatusId', 'marital_status_id'],
      ['residencyStatusId', 'residency_status_id'], ['gender', 'gender'], ['workMode', 'work_mode'],
    ];
    for (const [key, column] of equals) if (query[key] !== undefined) qb.andWhere(`e.${column} = :${key}`, { [key]: query[key] });
    if (query.startFrom) qb.andWhere('e.start_date >= :startFrom', { startFrom: query.startFrom });
    if (query.startTo) qb.andWhere('e.start_date <= :startTo', { startTo: query.startTo });
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    if (query.idExpiring) qb.andWhere('e.id_expiry_date IS NOT NULL AND e.id_expiry_date <= :soon', { soon });
    if (query.contractEnding) qb.andWhere('e.end_date IS NOT NULL AND e.end_date BETWEEN :today AND :soon', { today, soon });
  }

  async activeStates(userIds: string[]): Promise<Map<string, boolean>> {
    if (!userIds.length) return new Map();
    const rows: { id: string; is_active: boolean }[] = await this.ds.query('SELECT id, is_active FROM users WHERE id = ANY($1)', [userIds]);
    return new Map(rows.map((r) => [r.id, r.is_active]));
  }

  async insert(values: EmployeeValues, tx: TransactionContext): Promise<Employee> {
    return this.guard(() => managerOf(tx, this.repo.manager).getRepository(Employee).save(Object.assign(new Employee(), values)));
  }

  async update(id: string, values: EmployeeValues, tx: TransactionContext): Promise<void> {
    await this.guard(() => managerOf(tx, this.repo.manager).getRepository(Employee).update({ id }, values as Partial<Employee>));
  }

  /** Database constraints are the final word (two requests can race), so their violations are translated here. */
  private async guard<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (!(error instanceof QueryFailedError)) throw error;
      const { code, constraint } = error.driverError as { code?: string; constraint?: string };
      if (code === PG_UNIQUE_VIOLATION) throw uniqueError(constraint);
      if (code === PG_FOREIGN_KEY_VIOLATION) throw new InvalidReferenceError();
      throw error;
    }
  }

  private async taken(column: string, value: string, exceptId?: string): Promise<boolean> {
    const qb = this.repo.createQueryBuilder('e').where(`e.${column} = :value`, { value });
    if (exceptId) qb.andWhere('e.id <> :exceptId', { exceptId });
    return (await qb.getCount()) > 0;
  }

  emailTaken(email: string, exceptId?: string): Promise<boolean> {
    return this.taken('work_email', email, exceptId);
  }

  numberTaken(employeeNumber: string, exceptId?: string): Promise<boolean> {
    return this.taken('employee_number', employeeNumber, exceptId);
  }

  async idDocumentTaken(idTypeId: string, hash: string, exceptId?: string): Promise<boolean> {
    const qb = this.repo.createQueryBuilder('e').where('e.id_type_id = :idTypeId AND e.id_number_hash = :hash', { idTypeId, hash });
    if (exceptId) qb.andWhere('e.id <> :exceptId', { exceptId });
    return (await qb.getCount()) > 0;
  }

  async searchManagers(search: string | undefined, excludeId: string | undefined): Promise<ManagerOptionDto[]> {
    const qb = this.repo.createQueryBuilder('e').select(['e.id', 'e.employeeNumber', 'e.fullName']).orderBy('e.full_name').take(MANAGER_RESULTS);
    if (search) qb.andWhere('(e.full_name ILIKE :term OR e.employee_number ILIKE :term)', { term: `%${escapeLike(search)}%` });
    if (excludeId) qb.andWhere('e.id <> :excludeId', { excludeId });
    return (await qb.getMany()).map((e) => ({ id: e.id, employeeNumber: e.employeeNumber, fullName: e.fullName }));
  }

  async reportsTo(candidateManagerId: string, employeeId: string): Promise<boolean> {
    const rows: unknown[] = await this.ds.query(
      `WITH RECURSIVE chain(id, manager_id, depth) AS (
         SELECT id, manager_id, 0 FROM employees WHERE id = $1 AND deleted_at IS NULL
         UNION ALL
         SELECT e.id, e.manager_id, c.depth + 1 FROM employees e JOIN chain c ON e.id = c.manager_id WHERE e.deleted_at IS NULL AND c.depth < 100
       ) SELECT 1 FROM chain WHERE id = $2 LIMIT 1`,
      [candidateManagerId, employeeId],
    );
    return rows.length > 0;
  }

  async summary(scope: ScopeFilter, window: { today: string; soonUntil: string }): Promise<EmployeesSummaryDto> {
    const qb = this.repo
      .createQueryBuilder('e')
      .innerJoin('users', 'u', 'u.id = e.user_id')
      .select('count(*)::int', 'total')
      .addSelect('count(*) FILTER (WHERE u.is_active)::int', 'active')
      .addSelect('count(*) FILTER (WHERE NOT u.is_active)::int', 'inactive')
      .addSelect('count(*) FILTER (WHERE e.is_system_account = false AND (e.org_node_id IS NULL OR e.job_title_id IS NULL))::int', 'needsPlacement')
      .addSelect('count(*) FILTER (WHERE e.id_expiry_date IS NOT NULL AND e.id_expiry_date <= :soonUntil)::int', 'idExpiring')
      .addSelect('count(*) FILTER (WHERE e.end_date IS NOT NULL AND e.end_date >= :today AND e.end_date <= :soonUntil)::int', 'contractEnding')
      .setParameters(window);
    applyScope(qb, scope, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    return qb.getRawOne<EmployeesSummaryDto>() as Promise<EmployeesSummaryDto>;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.repo.count({ where: { id } })) > 0;
  }

  async endedStillActive(today: string): Promise<{ id: string; userId: string }[]> {
    const rows: { id: string; user_id: string }[] = await this.ds.query(
      `SELECT e.id, e.user_id FROM employees e JOIN users u ON u.id = e.user_id
       WHERE e.deleted_at IS NULL AND e.is_system_account = false AND e.end_date IS NOT NULL AND e.end_date < $1 AND u.is_active`,
      [today],
    );
    return rows.map((r) => ({ id: r.id, userId: r.user_id }));
  }
}

function uniqueError(constraint: string | undefined): Error {
  if (constraint === 'UQ_employees_work_email') return new EmployeeEmailTakenError();
  if (constraint === 'UQ_employees_number') return new EmployeeNumberTakenError();
  if (constraint === 'UQ_employees_id_document') return new IdDocumentTakenError();
  return new InvalidReferenceError();
}
