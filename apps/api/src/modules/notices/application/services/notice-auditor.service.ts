import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';

/** Writes the audit entries of the notices module. Never pass the text of a notice or the reason of a rejection: the entry says what happened and to whom, not what was written. */
@Injectable()
export class NoticeAuditor {
  constructor(private readonly events: EventEmitter2) {}

  record(actorId: string | null, action: string, entity: { type?: 'notice' | 'notice_channel' | 'notice_settings'; id: string }, changes: Record<string, unknown> = {}): void {
    const event: AuditEvent = { actorId, action, entityType: entity.type ?? 'notice', entityId: entity.id, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
