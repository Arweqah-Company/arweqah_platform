import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, type RejectRequestInput } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { FilesService } from '../../../../core/files/application/files.service';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { WorkflowEngine } from '../../../../core/workflow/application/workflow-engine';
import type { WorkflowTransitionedPayload } from '../../../../core/workflow/application/workflow.topics';
import { CareerApproverPort } from '../../domain/contracts/career-approver.port';
import { CareerRequestRepository } from '../../domain/contracts/career-request.repository';
import { EmployeeCareerPort } from '../../domain/contracts/employee-career.port';
import { CareerRequestNotOpenError, CareerRequestNotYoursError } from '../../domain/errors/career-profile.errors';
import { DEV_REQUEST_KEY } from '../../domain/rules/development-request.machine';
import { resolveApprover } from '../../domain/rules/development-request.rules';
import type { RequestRow } from '../../domain/types/career-profile.types';
import { CAREER_AUDIT, CAREER_REQUEST_ENTITY } from '../messages/career-profile.messages';
import { CareerRequestService } from './career-request.service';

type Event = 'APPROVE' | 'REJECT';

/** Deciding a development request (FR-116): only the person it is with, approving or rejecting with a reason; and sending it up when the direct manager did not answer in time. */
@Injectable()
export class CareerRequestDecisionService {
  constructor(
    private readonly requests: CareerRequestRepository,
    private readonly approvers: CareerApproverPort,
    private readonly employees: EmployeeCareerPort,
    private readonly requestsService: CareerRequestService,
    private readonly files: FilesService,
    private readonly workflow: WorkflowEngine,
    private readonly notifications: NotificationsService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** The retention agreement of a request, for the person who may open the request (the foundation lets only the uploader read a file; this grants the approver). */
  async agreement(ctx: AccessContext, id: string) {
    const row = await this.visible(ctx, id);
    if (!row.agreementFileId) throw new NotFoundError('Agreement file', id);
    return this.files.getGranted(row.agreementFileId);
  }

  approve(ctx: AccessContext, id: string): Promise<void> {
    return this.decide(ctx, id, { event: 'APPROVE', status: 'approved', reason: null, action: CAREER_AUDIT.requestApproved });
  }

  reject(ctx: AccessContext, id: string, input: RejectRequestInput): Promise<void> {
    return this.decide(ctx, id, { event: 'REJECT', status: 'rejected', reason: input.reason, action: CAREER_AUDIT.requestRejected });
  }

  private async decide(ctx: AccessContext, id: string, d: { event: Event; status: 'approved' | 'rejected'; reason: string | null; action: string }): Promise<void> {
    const row = await this.visible(ctx, id);
    if (row.status !== 'pending') throw new CareerRequestNotOpenError();
    if (row.approverUserId !== ctx.userId) throw new CareerRequestNotYoursError();
    const instance = await this.workflow.findByEntity(CAREER_REQUEST_ENTITY, id);
    if (!instance || instance.isDone) throw new CareerRequestNotOpenError();
    await this.tx.run(async (tx) => {
      const applied = await this.requests.decide(id, ctx.userId, { status: d.status, decidedBy: ctx.userId, decidedAt: this.clock.now(), rejectionReason: d.reason }, tx);
      if (!applied) throw new CareerRequestNotOpenError();
      await this.workflow.send({ instanceId: instance.id, event: { type: d.event }, actorId: ctx.userId, comment: d.reason ?? undefined, tx });
      await this.tellEmployee(row, d.status === 'approved', d.reason, tx);
    });
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: d.action, entityType: CAREER_REQUEST_ENTITY, entityId: id, changes: { employeeId: row.employeeId, cost: row.cost } } satisfies AuditEvent);
  }

  /** A request the viewer may open: the one that is with them, or one of the people their view scope reaches (404 otherwise). */
  private async visible(ctx: AccessContext, id: string): Promise<RequestRow> {
    const row = await this.requests.findById(id);
    if (!row) throw new NotFoundError('Request', id);
    if (row.approverUserId === ctx.userId) return row;
    const filter = ctx.filterFor(CorePermission.CareerRequestsView);
    if (!filter || !(await this.requests.inScope(id, filter))) throw new NotFoundError('Request', id);
    return row;
  }

  /** The reaction to the engine's timeout: a request still with the direct manager goes to the next post, and both the new approver and the employee are told. */
  async onTransitioned(payload: WorkflowTransitionedPayload): Promise<void> {
    if (payload.definitionKey !== DEV_REQUEST_KEY || payload.event !== 'TIMEOUT' || payload.to !== 'sector') return;
    const row = await this.requests.findById(payload.entityId);
    if (!row || row.status !== 'pending' || row.level !== 'direct') return;
    const users = await this.approvers.usersFor(row.employeeId);
    const own = await this.employees.userOf(row.employeeId);
    const next = resolveApprover('sector', users, own ?? '');
    if (!next) return; // nobody holds a higher post: the direct manager keeps the request and can still decide it
    await this.tx.run(async (tx) => {
      const moved = await this.requests.escalate(row.id, 'direct', { level: next.level, approverUserId: next.userId }, tx);
      if (!moved) return;
      const after = (await this.requests.findById(row.id, tx)) as RequestRow;
      await this.requestsService.tellApprover(after, tx);
      await this.tellWaiting(row, tx);
    });
    this.events.emit(AUDIT_EVENT, { actorId: null, action: CAREER_AUDIT.requestEscalated, entityType: CAREER_REQUEST_ENTITY, entityId: row.id, changes: { to: next.level } } satisfies AuditEvent);
  }

  private async tellWaiting(row: RequestRow, tx: TransactionContext): Promise<void> {
    const user = await this.employees.userOf(row.employeeId);
    if (!user) return;
    await this.notifications.notify({
      userIds: [user], link: '/career-profile', tx,
      titleAr: 'صُعِّد طلب تطويرك', titleEn: 'Your development request went up',
      bodyAr: `لم يردّ مديرك المباشر في المهلة، فانتقل طلب «${row.courseName}» إلى مدير القطاع.`, bodyEn: `Your direct manager did not answer in time: «${row.courseName}» went to the sector head.`,
    });
  }

  private async tellEmployee(row: RequestRow, approved: boolean, reason: string | null, tx: TransactionContext): Promise<void> {
    const user = await this.employees.userOf(row.employeeId);
    if (!user) return;
    await this.notifications.notify({
      userIds: [user], link: '/career-profile', tx,
      titleAr: approved ? 'اعتُمد طلب تطويرك' : 'رُفض طلب تطويرك', titleEn: approved ? 'Your development request was approved' : 'Your development request was rejected',
      bodyAr: approved ? row.courseName : `${row.courseName}: ${reason ?? ''}`, bodyEn: approved ? row.courseName : `${row.courseName}: ${reason ?? ''}`,
    });
  }
}
