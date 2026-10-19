/** Emit this in-process event from any module to write an audit entry (Observer pattern). */
export const AUDIT_EVENT = 'audit.record';

export interface AuditEvent {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  ip?: string | null;
}
