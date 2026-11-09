import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PROOF_REJECTIONS_BEFORE_MANAGER, type CertificateReviewItemDto, type CertificatesPageDto, type CertificatesQuery, type RejectProofInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { FilesService } from '../../../../core/files/application/files.service';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { WorkflowEngine } from '../../../../core/workflow/application/workflow-engine';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerLearningRepository } from '../../domain/contracts/career-learning.repository';
import { EmployeeCareerPort } from '../../domain/contracts/employee-career.port';
import { CareerRecordNotOpenError } from '../../domain/errors/career-profile.errors';
import { findUnit } from '../../domain/rules/learning-proof.rules';
import type { LearningRecordRow, QueueRow, RecordDecision } from '../../domain/types/career-profile.types';
import { CAREER_AUDIT, CAREER_PROOF_ENTITY } from '../messages/career-profile.messages';

type Decision = 'APPROVE' | 'REJECT' | 'REFER';

/** The review of the proofs of learning units (FR-114): the queue, the file, approving, rejecting with a reason, referring to the direct manager. */
@Injectable()
export class CareerReviewService {
  constructor(
    private readonly records: CareerLearningRepository,
    private readonly content: CareerContentRepository,
    private readonly employees: EmployeeCareerPort,
    private readonly files: FilesService,
    private readonly workflow: WorkflowEngine,
    private readonly notifications: NotificationsService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async queue(query: CertificatesQuery): Promise<CertificatesPageDto> {
    const { items, total } = await this.records.queue(query);
    const titles = await this.unitTitles(items);
    return { items: items.map((r) => toItem(r, titles.get(`${r.titleId}:${r.unitId}`) ?? '')), total, page: query.page, pageSize: query.pageSize };
  }

  /** The file of a proof, for the person who reviews it (the foundation lets only the uploader read a file; this grants the reviewer). */
  async file(id: string) {
    const record = await this.open(id, false);
    if (!record.fileId) throw new NotFoundError('Proof file', id);
    return this.files.getGranted(record.fileId);
  }

  approve(ctx: AccessContext, id: string): Promise<void> {
    return this.decide(ctx, id, { event: 'APPROVE', change: { status: 'done', rejectionReason: null, rejectionIncrement: 0 }, action: CAREER_AUDIT.proofApproved });
  }

  reject(ctx: AccessContext, id: string, input: RejectProofInput): Promise<void> {
    return this.decide(ctx, id, { event: 'REJECT', change: { status: 'rej', rejectionReason: input.reason, rejectionIncrement: 1 }, action: CAREER_AUDIT.proofRejected });
  }

  async refer(ctx: AccessContext, id: string): Promise<void> {
    if ((await this.open(id, true)).status === 'referred') throw new CareerRecordNotOpenError(); // already with the manager
    return this.decide(ctx, id, { event: 'REFER', change: { status: 'referred', rejectionReason: null, rejectionIncrement: 0 }, action: CAREER_AUDIT.proofReferred });
  }

  private async decide(ctx: AccessContext, id: string, { event, change, action }: { event: Decision; change: Pick<RecordDecision, 'status' | 'rejectionReason' | 'rejectionIncrement'>; action: string }): Promise<void> {
    const record = await this.open(id, true);
    const instance = await this.workflow.findByEntity(CAREER_PROOF_ENTITY, id);
    if (!instance || instance.isDone) throw new CareerRecordNotOpenError();
    await this.tx.run(async (tx) => {
      const applied = await this.records.decide(id, { ...change, decidedBy: ctx.userId, decidedAt: this.clock.now() }, tx);
      if (!applied) throw new CareerRecordNotOpenError();
      await this.workflow.send({ instanceId: instance.id, event: { type: event }, actorId: ctx.userId, comment: change.rejectionReason ?? undefined, tx });
      await this.tell(record, event, change.rejectionReason, tx);
    });
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: CAREER_PROOF_ENTITY, entityId: id, changes: { employeeId: record.employeeId, unitId: record.unitId } } satisfies AuditEvent);
  }

  /** Tells the employee the outcome (the reason is in the notice), and their direct manager after the third rejection of the same unit. */
  private async tell(record: LearningRecordRow, event: Decision, reason: string | null, tx: TransactionContext): Promise<void> {
    if (event !== 'REFER') await this.tellEmployee(record, event === 'APPROVE', reason, tx);
    if (event === 'REJECT' && record.rejectionCount + 1 >= PROOF_REJECTIONS_BEFORE_MANAGER) await this.tellManager(record, tx);
  }

  private async tellEmployee(record: LearningRecordRow, approved: boolean, reason: string | null, tx: TransactionContext): Promise<void> {
    const person = await this.employees.userOf(record.employeeId);
    if (!person) return;
    await this.notifications.notify({
      userIds: [person], link: '/career-profile', tx,
      titleAr: approved ? 'اعتُمد إثباتك' : 'رُفض إثباتك', titleEn: approved ? 'Your proof was approved' : 'Your proof was rejected',
      bodyAr: approved ? 'احتُسبت ساعات الوحدة.' : (reason ?? ''), bodyEn: approved ? 'The hours of the unit now count.' : (reason ?? ''),
    });
  }

  private async tellManager(record: LearningRecordRow, tx: TransactionContext): Promise<void> {
    const manager = await this.employees.managerUserId(record.employeeId);
    if (!manager) return;
    await this.notifications.notify({ userIds: [manager], link: '/career-team', tx, titleAr: 'تكرّر رفض إثبات أحد فريقك', titleEn: 'A proof of your team member was rejected again', bodyAr: 'رُفض إثبات الوحدة نفسها ثلاث مرات.', bodyEn: 'The proof of the same unit was rejected three times.' });
  }

  private async open(id: string, mustBeOpen: boolean): Promise<LearningRecordRow> {
    const record = await this.records.findById(id);
    if (!record) throw new NotFoundError('Proof', id);
    if (mustBeOpen && record.status !== 'wait' && record.status !== 'referred') throw new CareerRecordNotOpenError();
    return record;
  }

  /** The title of each unit of the page, read from the content of the title. */
  private async unitTitles(rows: QueueRow[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const titleId of new Set(rows.map((r) => r.titleId))) {
      const stored = await this.content.find(titleId);
      for (const r of rows.filter((x) => x.titleId === titleId)) {
        const unit = stored ? findUnit(stored.content, r.unitId) : null;
        if (unit) out.set(`${titleId}:${r.unitId}`, unit.title);
      }
    }
    return out;
  }
}

function toItem(r: QueueRow, unitTitle: string): CertificateReviewItemDto {
  return {
    id: r.id, employeeId: r.employeeId, employeeName: r.employeeName, unitNameAr: r.unitNameAr, unitNameEn: r.unitNameEn, unitTitle, kind: r.proofKind, status: r.status, minutes: r.minutes,
    note: r.note, fileName: r.fileName, hasFile: !!r.fileId, submittedAt: r.submittedAt.toISOString(), rejectionCount: r.rejectionCount,
  };
}
