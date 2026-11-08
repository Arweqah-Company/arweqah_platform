import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AcknowledgeCareerInput, MyCareerProfileDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { impersonationStamp } from '../../../../core/audit/application/impersonation-stamp';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { CareerAcknowledgementRepository } from '../../domain/contracts/career-acknowledgement.repository';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { EmployeeCareerPort, type CareerEmployee } from '../../domain/contracts/employee-career.port';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import { CareerAckAsAnotherError, CareerContentStaleError, CareerPathNotAvailableError } from '../../domain/errors/career-profile.errors';
import { acknowledgementState } from '../../domain/rules/acknowledgement.rules';
import type { StoredCareerContent } from '../../domain/types/career-profile.types';
import { CAREER_AUDIT, CAREER_ENTITY } from '../messages/career-profile.messages';

const NOT_AVAILABLE: MyCareerProfileDto = {
  available: false, titleId: null, titleCode: null, titleNameAr: null, titleNameEn: null, grade: null, track: null, unitCode: null, unitNameAr: null, unitNameEn: null,
  employeeName: null, managerName: null, stage: null, contentVersion: null, content: null,
  ackRequired: false, ackReason: null, acknowledgedAt: null, acknowledgedVersion: null,
};

/** The signed-in employee's own career path and its acknowledgement (FR-111, FR-112). */
@Injectable()
export class CareerProfileService {
  constructor(
    private readonly employees: EmployeeCareerPort,
    private readonly content: CareerContentRepository,
    private readonly acks: CareerAcknowledgementRepository,
    private readonly titles: TitleIdentityPort,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  /** The path of the title the person holds, once HR set it ready; and whether the platform is held back until they acknowledge it. */
  async me(ctx: AccessContext): Promise<MyCareerProfileDto> {
    const found = await this.readyPath(ctx.userId);
    if (!found) return NOT_AVAILABLE;
    const { employee, stored, titleId } = found;
    const [title, latest, reopenedAt, everAcknowledged] = await Promise.all([
      this.titles.identity(titleId),
      this.acks.latest(employee.employeeId, titleId),
      this.acks.latestReopening(titleId),
      this.acks.countFor(employee.employeeId).then((n) => n > 0),
    ]);
    const state = acknowledgementState({ latest, reopenedAt, everAcknowledged });
    const held = state.pending && !employee.isSystemAccount && !impersonationStamp.getStore();
    return {
      available: true, titleId, titleCode: title.code, titleNameAr: title.nameAr, titleNameEn: title.nameEn, grade: title.grade, track: title.track,
      unitCode: title.unit.code, unitNameAr: title.unit.nameAr, unitNameEn: title.unit.nameEn, employeeName: employee.fullName, managerName: employee.managerName, stage: title.stage,
      contentVersion: stored.version, content: stored.content,
      ackRequired: held, ackReason: state.pending ? state.reason : null,
      acknowledgedAt: latest?.acknowledgedAt.toISOString() ?? null, acknowledgedVersion: latest?.contentVersion ?? null,
    };
  }

  /** Records the acknowledgement of the version the person read (a newer version is a 409: they must read it first). */
  async acknowledge(ctx: AccessContext, input: AcknowledgeCareerInput): Promise<MyCareerProfileDto> {
    if (impersonationStamp.getStore()) throw new CareerAckAsAnotherError();
    const found = await this.readyPath(ctx.userId);
    if (!found) throw new CareerPathNotAvailableError();
    if (input.contentVersion !== found.stored.version) throw new CareerContentStaleError(input.contentVersion, found.stored.version);
    await this.tx.run((tx) => this.acks.acknowledge(found.employee.employeeId, found.titleId, input.contentVersion, tx));
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: CAREER_AUDIT.acknowledged, entityType: CAREER_ENTITY, entityId: found.titleId, changes: { version: input.contentVersion } } satisfies AuditEvent);
    return this.me(ctx);
  }

  private async readyPath(userId: string): Promise<{ employee: CareerEmployee; titleId: string; stored: StoredCareerContent } | null> {
    const employee = await this.employees.forUser(userId);
    if (!employee?.titleId) return null;
    const stored = await this.content.find(employee.titleId);
    return stored?.status === 'ready' ? { employee, titleId: employee.titleId, stored } : null;
  }
}
