import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { MyProgressDto, SetRequiredInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerLearningRepository } from '../../domain/contracts/career-learning.repository';
import { EmployeeCareerPort } from '../../domain/contracts/employee-career.port';
import { CareerPathNotAvailableError } from '../../domain/errors/career-profile.errors';
import { approvedMinutes } from '../../domain/rules/learning-proof.rules';
import { badgeProgress, unitCount, validRequiredIndexes } from '../../domain/rules/progress.rules';
import type { StoredCareerContent } from '../../domain/types/career-profile.types';
import { CAREER_AUDIT, CAREER_ENTITY } from '../messages/career-profile.messages';

/** The progress of the signed-in employee in the path of their title: the proofs, the medals and the ticks of «required» (FR-114). */
@Injectable()
export class CareerProgressService {
  constructor(
    private readonly employees: EmployeeCareerPort,
    private readonly content: CareerContentRepository,
    private readonly records: CareerLearningRepository,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async mine(ctx: AccessContext): Promise<MyProgressDto> {
    const { employeeId, titleId, stored } = await this.path(ctx.userId);
    const [records, ticked] = await Promise.all([this.records.forEmployee(employeeId), this.records.requiredDone(employeeId, titleId)]);
    const minutes = approvedMinutes(records);
    return {
      requiredDone: validRequiredIndexes(stored.content, ticked),
      unitsDone: records.filter((r) => r.status === 'done').length,
      unitsTotal: unitCount(stored.content),
      waiting: records.filter((r) => r.status === 'wait' || r.status === 'referred').length,
      ...badgeProgress(stored.content, minutes),
    };
  }

  /** Ticks or unticks an item of «required» of the title the person holds; an index the content does not have is a 404. */
  async setRequired(ctx: AccessContext, index: number, input: SetRequiredInput): Promise<MyProgressDto> {
    const { employeeId, titleId, stored } = await this.path(ctx.userId);
    if (index >= stored.content.required.length) throw new NotFoundError('Required item', String(index));
    await this.tx.run((tx) => this.records.setRequired({ employeeId, titleId, index, done: input.done, at: this.clock.now() }, tx));
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: CAREER_AUDIT.requiredTicked, entityType: CAREER_ENTITY, entityId: titleId, changes: { index, done: input.done } } satisfies AuditEvent);
    return this.mine(ctx);
  }

  private async path(userId: string): Promise<{ employeeId: string; titleId: string; stored: StoredCareerContent }> {
    const employee = await this.employees.forUser(userId);
    const stored = employee?.titleId ? await this.content.find(employee.titleId) : null;
    if (!employee?.titleId || stored?.status !== 'ready') throw new CareerPathNotAvailableError();
    return { employeeId: employee.employeeId, titleId: employee.titleId, stored };
  }
}
