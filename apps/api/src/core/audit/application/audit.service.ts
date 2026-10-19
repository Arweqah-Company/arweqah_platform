import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AuditLogDto, AuditQuery, Paginated } from '@arweqah-platform/shared';
import { AuditLogRepository } from '../domain/audit-log.repository';
import { AUDIT_EVENT, type AuditEvent } from './audit.events';

const REDACTED_KEYS = /password|secret|token|national.?id|iban/i;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly logs: AuditLogRepository) {}

  @OnEvent(AUDIT_EVENT, { async: true })
  async record(event: AuditEvent): Promise<void> {
    try {
      await this.logs.append({
        actorId: event.actorId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        changes: event.changes ? redact(event.changes) : null,
        ip: event.ip ?? null,
      });
    } catch (error) {
      // Auditing must never break the business action that triggered it.
      this.logger.error(`Failed to write audit entry ${event.action}`, error as Error);
    }
  }

  search(query: AuditQuery): Promise<Paginated<AuditLogDto>> {
    return this.logs.search(query);
  }
}

/** Sensitive values never reach the audit table. */
export function redact(changes: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).map(([k, v]) => [k, REDACTED_KEYS.test(k) ? '[redacted]' : v]),
  );
}
