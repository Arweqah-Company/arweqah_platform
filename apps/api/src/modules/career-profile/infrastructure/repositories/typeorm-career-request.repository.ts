import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, type SelectQueryBuilder } from 'typeorm';
import type { RequestLevel, RequestPlanKind, RequestStatus, RequestsQuery } from '@arweqah-platform/shared';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import { applyScope } from '../../../../core/access/infrastructure/scope-query';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { CareerRequestRepository } from '../../domain/contracts/career-request.repository';
import { CareerDevelopmentRequest } from '../../domain/entities/career-requests.entities';
import type { RequestDecision, RequestRow, RequestWrite } from '../../domain/types/career-profile.types';

interface RawRow {
  id: string; employee_id: string; employee_name: string; course_name: string; cost: number; plan: RequestPlanKind; status: RequestStatus; level: RequestLevel;
  approver_user_id: string | null; approver_name: string | null; agreement_file_id: string | null; agreement_name: string | null; budget_cap: number | null;
  rejection_reason: string | null; submitted_at: Date; decided_at: Date | null;
}

const SELECT = [
  'r.id AS id', 'r.employee_id AS employee_id', 'e.full_name AS employee_name', 'r.course_name AS course_name', 'r.cost AS cost', 'r.plan AS plan', 'r.status AS status',
  'r.level AS level', 'r.approver_user_id AS approver_user_id', 'a.full_name AS approver_name', 'r.agreement_file_id AS agreement_file_id', 'f.original_name AS agreement_name',
  'r.budget_cap AS budget_cap', 'r.rejection_reason AS rejection_reason', 'r.submitted_at AS submitted_at', 'r.decided_at AS decided_at',
];

@Injectable()
export class TypeOrmCareerRequestRepository extends CareerRequestRepository {
  constructor(
    @InjectRepository(CareerDevelopmentRequest) private readonly requests: Repository<CareerDevelopmentRequest>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  private repo(tx?: TransactionContext): Repository<CareerDevelopmentRequest> {
    return tx ? managerOf(tx, this.ds.manager).getRepository(CareerDevelopmentRequest) : this.requests;
  }

  /** The request with the employee, the approver and the file names joined in (one place that builds the select). */
  private base(repo: Repository<CareerDevelopmentRequest> = this.requests): SelectQueryBuilder<CareerDevelopmentRequest> {
    return repo
      .createQueryBuilder('r')
      .innerJoin('employees', 'e', 'e.id = r.employee_id AND e.deleted_at IS NULL')
      .leftJoin('employees', 'a', 'a.user_id = r.approver_user_id AND a.deleted_at IS NULL')
      .leftJoin('files', 'f', 'f.id = r.agreement_file_id')
      .select(SELECT);
  }

  async insert(write: RequestWrite, tx: TransactionContext): Promise<RequestRow> {
    const saved = await this.repo(tx).save(Object.assign(new CareerDevelopmentRequest(), write, { status: 'pending' }));
    return (await this.findById(saved.id, tx)) as RequestRow;
  }

  async findById(id: string, tx?: TransactionContext): Promise<RequestRow | null> {
    const raw = await this.base(this.repo(tx)).where('r.id = :id', { id }).getRawOne<RawRow>();
    return raw ? toRow(raw) : null;
  }

  async forEmployee(employeeId: string): Promise<RequestRow[]> {
    const raws = await this.base().where('r.employee_id = :employeeId', { employeeId }).orderBy('r.submitted_at', 'DESC').getRawMany<RawRow>();
    return raws.map(toRow);
  }

  async list(query: RequestsQuery, viewer: { userId: string; filter: ScopeFilter | null }): Promise<{ items: RequestRow[]; total: number }> {
    if (!query.mine && !viewer.filter) return { items: [], total: 0 };
    const qb = this.base();
    if (query.mine) qb.where('r.approver_user_id = :viewer AND r.status = :pending', { viewer: viewer.userId, pending: 'pending' });
    else applyScope(qb, viewer.filter as ScopeFilter, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.level) qb.andWhere('r.level = :level', { level: query.level });
    if (query.plan) qb.andWhere('r.plan = :plan', { plan: query.plan });
    if (query.search) qb.andWhere('(e.full_name ILIKE :search OR r.course_name ILIKE :search)', { search: likeContains(query.search) });
    const total = await qb.getCount();
    const raws = await qb.orderBy('r.submitted_at', 'ASC').addOrderBy('r.id', 'ASC').offset((query.page - 1) * query.pageSize).limit(query.pageSize).getRawMany<RawRow>();
    return { items: raws.map(toRow), total };
  }

  async inScope(id: string, filter: ScopeFilter): Promise<boolean> {
    const qb = this.base().where('r.id = :id', { id });
    applyScope(qb, filter, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    return (await qb.getCount()) > 0;
  }

  async decide(id: string, approverUserId: string, decision: RequestDecision, tx: TransactionContext): Promise<boolean> {
    const result = await this.repo(tx)
      .createQueryBuilder()
      .update(CareerDevelopmentRequest)
      .set({ status: decision.status, decidedBy: decision.decidedBy, decidedAt: decision.decidedAt, rejectionReason: decision.rejectionReason })
      .where('id = :id AND status = :pending AND approver_user_id = :approverUserId', { id, pending: 'pending', approverUserId })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async escalate(id: string, from: RequestLevel, to: { level: RequestLevel; approverUserId: string | null }, tx: TransactionContext): Promise<boolean> {
    const result = await this.repo(tx)
      .createQueryBuilder()
      .update(CareerDevelopmentRequest)
      .set({ level: to.level, approverUserId: to.approverUserId })
      .where('id = :id AND status = :pending AND level = :from', { id, pending: 'pending', from })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async approvedCost(employeeId: string, from: Date, to: Date): Promise<number> {
    const row = await this.requests
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.cost), 0)', 'total')
      .where('r.employee_id = :employeeId AND r.status = :approved AND r.decided_at >= :from AND r.decided_at < :to', { employeeId, approved: 'approved', from, to })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }
}

const toRow = (r: RawRow): RequestRow => ({
  id: r.id, employeeId: r.employee_id, employeeName: r.employee_name, courseName: r.course_name, cost: r.cost, plan: r.plan, status: r.status, level: r.level,
  approverUserId: r.approver_user_id, approverName: r.approver_name, agreementFileId: r.agreement_file_id, agreementName: r.agreement_name, budgetCap: r.budget_cap,
  rejectionReason: r.rejection_reason, submittedAt: r.submitted_at, decidedAt: r.decided_at,
});
