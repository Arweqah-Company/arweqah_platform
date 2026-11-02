import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import type { AuditLogDto, AuditQuery, Paginated } from '@arweqah-platform/shared';
import type { ChainCheck } from '../domain/audit-chain';
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

  /** Checks the hash chain: every entry must say what came before it and hash to what it says. */
  async verify(): Promise<ChainCheck> {
    return this.logs.verify();
  }

  /** Every Sunday at 04:00 (Riyadh); a broken chain is logged as an error and recorded. */
  @Cron('0 4 * * 0', { timeZone: 'Asia/Riyadh' })
  async scheduledCheck(): Promise<void> {
    const result = await this.logs.verify();
    if (result.ok) return;
    this.logger.error(`The audit log chain is broken at entry ${result.brokenAtSeq}`);
    await this.record({ actorId: null, action: 'audit.chain_broken', entityType: 'audit', entityId: result.brokenAtSeq, changes: { checked: result.checked } });
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
