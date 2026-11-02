import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import type { AccessExceptionDto, ExceptionRef, SetExceptionExpiryInput } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { todayInRiyadh } from '../../../common/domain/riyadh-date';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { AccessExceptionRepository } from '../domain/access-exception.repository';
import { PastEndDateError } from '../domain/errors';
import { ACCESS_CHANGED } from './access.events';
import { PermissionCatalog } from './permission-catalog';

/** What was given to a person outside what their job title, the Employee role and their place bring: the list, taking one back, changing its last day, and taking back what has ended. */
@Injectable()
export class AccessExceptionsService {
  private readonly logger = new Logger(AccessExceptionsService.name);

  constructor(
    private readonly exceptions: AccessExceptionRepository,
    private readonly catalog: PermissionCatalog,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<AccessExceptionDto[]> {
    const names = new Map(this.catalog.all().map((d) => [d.key, d]));
    return (await this.exceptions.list()).map((row) => ({
      ...row,
      targetNameAr: row.targetNameAr ?? names.get(row.targetId)?.labelAr ?? row.targetId,
      targetNameEn: row.targetNameEn ?? names.get(row.targetId)?.labelEn ?? row.targetId,
    }));
  }

  async revoke(ref: ExceptionRef, actorId: string): Promise<void> {
    if (!(await this.exceptions.remove(ref))) throw new NotFoundError('Exception', ref.targetId);
    this.changed(actorId, 'access.exception_revoked', ref, {});
  }

  async setExpiry(ref: ExceptionRef, input: SetExceptionExpiryInput, actorId: string): Promise<void> {
    if (input.expiresAt !== null && input.expiresAt < todayInRiyadh()) throw new PastEndDateError();
    if (!(await this.exceptions.setExpiry(ref, input.expiresAt))) throw new NotFoundError('Exception', ref.targetId);
    this.changed(actorId, 'access.exception_expiry_changed', ref, { expiresAt: input.expiresAt });
  }

  /** Every night: what ended before today is taken back and written to the audit log. */
  @Cron('10 3 * * *', { timeZone: 'Asia/Riyadh' })
  async removeEnded(today: string = todayInRiyadh()): Promise<number> {
    const removed = await this.exceptions.removeEnded(today);
    for (const ref of removed) this.changed(null, 'access.exception_expired', ref, { endedBefore: today });
    if (removed.length) this.logger.log(`${removed.length} ended exceptions taken back`);
    return removed.length;
  }

  private changed(actorId: string | null, action: string, ref: ExceptionRef, changes: Record<string, unknown>): void {
    this.events.emit(ACCESS_CHANGED, { userId: ref.userId });
    const event: AuditEvent = { actorId, action, entityType: 'exception', entityId: ref.userId, changes: { kind: ref.kind, target: ref.targetId, ...changes } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
