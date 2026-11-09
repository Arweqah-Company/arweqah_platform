import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { LearningRecordDto, SubmitProofInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { Clock } from '../../../../common/application/clock';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { FilesService } from '../../../../core/files/application/files.service';
import { WorkflowEngine } from '../../../../core/workflow/application/workflow-engine';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerLearningRepository } from '../../domain/contracts/career-learning.repository';
import { EmployeeCareerPort } from '../../domain/contracts/employee-career.port';
import { CareerPathNotAvailableError, CareerProofRefusedError } from '../../domain/errors/career-profile.errors';
import { CERTIFICATE_KEY } from '../../domain/rules/certificate.machine';
import { findUnit, proofProblem, startState } from '../../domain/rules/learning-proof.rules';
import type { LearningRecordRow } from '../../domain/types/career-profile.types';
import { CAREER_AUDIT, CAREER_PROOF_ENTITY } from '../messages/career-profile.messages';

export const toRecordDto = (r: LearningRecordRow): LearningRecordDto => ({
  id: r.id, unitId: r.unitId, status: r.status, kind: r.proofKind, note: r.note, fileName: r.fileName, minutes: r.minutes, submittedAt: r.submittedAt.toISOString(),
  decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null, rejectionReason: r.rejectionReason, rejectionCount: r.rejectionCount,
});

/** The employee's own proofs of the learning units of their title (FR-114): what they sent and sending a new one. */
@Injectable()
export class CareerProofService {
  constructor(
    private readonly employees: EmployeeCareerPort,
    private readonly content: CareerContentRepository,
    private readonly records: CareerLearningRepository,
    private readonly files: FilesService,
    private readonly workflow: WorkflowEngine,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async mine(ctx: AccessContext): Promise<LearningRecordDto[]> {
    const employee = await this.employees.forUser(ctx.userId);
    return employee ? (await this.records.forEmployee(employee.employeeId)).map(toRecordDto) : [];
  }

  /** Sends a proof for a unit of the plan of the title the person holds; the review starts at once. A rejected proof is replaced by the new one. */
  async submit(ctx: AccessContext, input: SubmitProofInput): Promise<LearningRecordDto> {
    const employee = await this.employees.forUser(ctx.userId);
    if (!employee?.titleId) throw new CareerPathNotAvailableError();
    const stored = await this.content.find(employee.titleId);
    const unit = stored?.status === 'ready' ? findUnit(stored.content, input.unitId) : null;
    if (!unit) throw new NotFoundError('Learning unit', input.unitId);
    const existing = await this.records.find(employee.employeeId, input.unitId);
    const problem = proofProblem(input, existing?.status ?? null);
    if (problem) throw new CareerProofRefusedError(problem);
    if (input.fileId) await this.files.getOwned(input.fileId, ctx.userId);
    const state = startState(input.kind);
    const row = await this.tx.run(async (tx) => {
      const saved = await this.records.submit({ employeeId: employee.employeeId, titleId: employee.titleId as string, unitId: input.unitId, status: state, proofKind: input.kind, fileId: input.fileId ?? null, note: input.note ?? null, minutes: unit.minutes, submittedAt: this.clock.now() }, tx);
      const run = await this.workflow.start({ definitionKey: CERTIFICATE_KEY, entityType: CAREER_PROOF_ENTITY, entityId: saved.id, actorId: ctx.userId, tx });
      if (state === 'referred') await this.workflow.send({ instanceId: run.id, event: { type: 'REFER' }, actorId: ctx.userId, tx });
      return saved;
    });
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: CAREER_AUDIT.proofSubmitted, entityType: CAREER_PROOF_ENTITY, entityId: row.id, changes: { kind: input.kind } } satisfies AuditEvent);
    return toRecordDto(row);
  }
}
