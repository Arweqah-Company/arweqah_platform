import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ReopenAcknowledgementInput, ReopenAcknowledgementResultDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { CareerAcknowledgementRepository } from '../../domain/contracts/career-acknowledgement.repository';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { EmployeeCareerPort } from '../../domain/contracts/employee-career.port';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import { CareerPathNotReadyError } from '../../domain/errors/career-profile.errors';
import { CAREER_AUDIT, CAREER_ENTITY } from '../messages/career-profile.messages';

/** HR asks the holders of a title to acknowledge its career path again (FR-112). */
@Injectable()
export class CareerReopenService {
  constructor(
    private readonly titles: TitleIdentityPort,
    private readonly content: CareerContentRepository,
    private readonly acks: CareerAcknowledgementRepository,
    private readonly employees: EmployeeCareerPort,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async reopen(titleId: string, input: ReopenAcknowledgementInput, actorId: string): Promise<ReopenAcknowledgementResultDto> {
    await this.titles.identity(titleId);
    if ((await this.content.find(titleId))?.status !== 'ready') throw new CareerPathNotReadyError();
    await this.tx.run((tx) => this.acks.reopen(titleId, input.reason, actorId, tx));
    const affected = await this.employees.holderCount(titleId);
    this.events.emit(AUDIT_EVENT, { actorId, action: CAREER_AUDIT.acknowledgementReopened, entityType: CAREER_ENTITY, entityId: titleId, changes: { affected } } satisfies AuditEvent);
    return { affected };
  }
}
