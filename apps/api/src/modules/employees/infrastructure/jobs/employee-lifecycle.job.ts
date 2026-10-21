import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { todayIso } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { IdentityProvider } from '../../../../core/auth/application/identity-provider';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import { EMPLOYEE_AUDIT } from '../../application/messages/employee.messages';

/** Ends sign-in for people whose contract ended: the account stops working the day after the end date. */
@Injectable()
export class EmployeeLifecycleJob {
  private readonly logger = new Logger(EmployeeLifecycleJob.name);

  constructor(
    private readonly repo: EmployeeRepository,
    private readonly identity: IdentityProvider,
    private readonly events: EventEmitter2,
  ) {}

  @Cron('0 1 * * *')
  async scheduled(): Promise<void> {
    const count = await this.deactivateEnded();
    if (count) this.logger.log(`Deactivated ${count} account(s) after contract end`);
  }

  /** Idempotent: running it twice changes nothing the second time. */
  async deactivateEnded(today: string = todayIso()): Promise<number> {
    const ended = await this.repo.endedStillActive(today);
    for (const { id, userId } of ended) {
      await this.identity.setActive(userId, false);
      const event: AuditEvent = { actorId: null, action: EMPLOYEE_AUDIT.deactivatedContractEnded, entityType: 'employee', entityId: id };
      this.events.emit(AUDIT_EVENT, event);
    }
    return ended.length;
  }
}
