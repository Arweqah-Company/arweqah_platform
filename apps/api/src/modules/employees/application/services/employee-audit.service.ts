import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';

/** Writes the audit entries of the employee records (field names and counts only, never values). */
@Injectable()
export class EmployeeAuditService {
  constructor(private readonly events: EventEmitter2) {}

  record(actorId: string | null, action: string, entityId: string, changes: Record<string, unknown> = {}): void {
    const event: AuditEvent = { actorId, action, entityType: 'employee', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
