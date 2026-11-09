import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, riyadhToday, type CreateRequestInput, type DevelopmentRequestDto, type RequestPreviewDto, type RequestPreviewQuery, type RequestsPageDto, type RequestsQuery } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { FilesService } from '../../../../core/files/application/files.service';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { WorkflowEngine } from '../../../../core/workflow/application/workflow-engine';
import { CareerApproverPort } from '../../domain/contracts/career-approver.port';
import { CareerRequestRepository } from '../../domain/contracts/career-request.repository';
import { EmployeeCareerPort, type CareerEmployee } from '../../domain/contracts/employee-career.port';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import { CareerPathNotAvailableError, CareerRequestNoApproverError } from '../../domain/errors/career-profile.errors';
import { DEV_REQUEST_KEY } from '../../domain/rules/development-request.machine';
import { budgetLeft, budgetYear, chainFor, resolveApprover } from '../../domain/rules/development-request.rules';
import type { RequestRow } from '../../domain/types/career-profile.types';
import { CAREER_AUDIT, CAREER_REQUEST_ENTITY } from '../messages/career-profile.messages';
import { toRequestDto } from '../transformers/development-request.transformer';

const ROUTE = { direct: 'ROUTE_DIRECT', sector: 'ROUTE_SECTOR', ceo: 'ROUTE_CEO' } as const;

/** The employee's development requests (FR-116): the chain a cost gives, sending a request, the employee's own list, and the approvers' list. */
@Injectable()
export class CareerRequestService {
  constructor(
    private readonly employees: EmployeeCareerPort,
    private readonly approvers: CareerApproverPort,
    private readonly titles: TitleIdentityPort,
    private readonly requests: CareerRequestRepository,
    private readonly files: FilesService,
    private readonly workflow: WorkflowEngine,
    private readonly notifications: NotificationsService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** Who would decide a request of this cost and plan, and what is left of the yearly budget (shown before sending). */
  async preview(ctx: AccessContext, query: RequestPreviewQuery): Promise<RequestPreviewDto> {
    const employee = await this.employee(ctx.userId);
    const [users, budget] = await Promise.all([this.approvers.usersFor(employee.employeeId), this.budget(employee)]);
    const picked = resolveApprover(chainFor(query.cost, query.plan), users, ctx.userId);
    const name = picked ? (await this.nameOf(picked.userId)) : null;
    return { level: picked?.level ?? chainFor(query.cost, query.plan), approverName: name, budgetCap: budget.cap, spent: budget.spent, left: budgetLeft(budget.cap, budget.spent) };
  }

  /** The signed-in employee's requests, newest first. */
  async mine(ctx: AccessContext): Promise<DevelopmentRequestDto[]> {
    const employee = await this.employees.forUser(ctx.userId);
    if (!employee) return [];
    const [rows, budget] = await Promise.all([this.requests.forEmployee(employee.employeeId), this.budget(employee)]);
    return rows.map((r) => toRequestDto(r, ctx.userId, budget.spent));
  }

  /** The approvers' page: the requests waiting for the viewer (`mine`), or those of the people their view scope reaches. */
  async list(ctx: AccessContext, query: RequestsQuery): Promise<RequestsPageDto> {
    const { items, total } = await this.requests.list(query, { userId: ctx.userId, filter: ctx.filterFor(CorePermission.CareerRequestsView) });
    return { items: items.map((r) => toRequestDto(r, ctx.userId, null)), total, page: query.page, pageSize: query.pageSize };
  }

  async create(ctx: AccessContext, input: CreateRequestInput): Promise<DevelopmentRequestDto> {
    const employee = await this.employee(ctx.userId);
    const users = await this.approvers.usersFor(employee.employeeId);
    const picked = resolveApprover(chainFor(input.cost, input.plan), users, ctx.userId);
    if (!picked) throw new CareerRequestNoApproverError();
    if (input.agreementFileId) await this.files.getOwned(input.agreementFileId, ctx.userId);
    const budget = await this.budget(employee);
    const row = await this.tx.run(async (tx) => {
      const saved = await this.requests.insert({ employeeId: employee.employeeId, courseName: input.courseName, cost: input.cost, plan: input.plan, level: picked.level, approverUserId: picked.userId, agreementFileId: input.agreementFileId ?? null, budgetCap: budget.cap, submittedAt: this.clock.now() }, tx);
      const run = await this.workflow.start({ definitionKey: DEV_REQUEST_KEY, entityType: CAREER_REQUEST_ENTITY, entityId: saved.id, actorId: ctx.userId, tx });
      await this.workflow.send({ instanceId: run.id, event: { type: ROUTE[picked.level] }, actorId: ctx.userId, tx });
      await this.tellApprover(saved, tx);
      return saved;
    });
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: CAREER_AUDIT.requestSubmitted, entityType: CAREER_REQUEST_ENTITY, entityId: row.id, changes: { cost: row.cost, plan: row.plan, level: row.level } } satisfies AuditEvent);
    return toRequestDto(row, ctx.userId, budget.spent);
  }

  /** Tells the person the request is with (the same notice when it goes up to the next one). */
  async tellApprover(row: RequestRow, tx: TransactionContext): Promise<void> {
    if (!row.approverUserId) return;
    await this.notifications.notify({
      userIds: [row.approverUserId], link: '/career-requests?mine=1', coalesce: true, tx,
      titleAr: 'طلب تطوير بانتظار قرارك', titleEn: 'A development request is waiting for your decision',
      bodyAr: `${row.employeeName}: ${row.courseName}`, bodyEn: `${row.employeeName}: ${row.courseName}`,
    });
  }

  private async employee(userId: string): Promise<CareerEmployee> {
    const employee = await this.employees.forUser(userId);
    if (!employee || employee.isSystemAccount) throw new CareerPathNotAvailableError();
    return employee;
  }

  /** The cap of the employee's stage and what was approved for them this Riyadh year. */
  private async budget(employee: CareerEmployee): Promise<{ cap: number | null; spent: number }> {
    const identity = employee.titleId ? await this.titles.identity(employee.titleId) : null;
    const { from, to } = budgetYear(riyadhToday(this.clock.now()));
    return { cap: identity?.stage?.budgetCap ?? null, spent: await this.requests.approvedCost(employee.employeeId, from, to) };
  }

  private async nameOf(userId: string): Promise<string | null> {
    return (await this.employees.nameOfUser(userId)) ?? null;
  }
}
