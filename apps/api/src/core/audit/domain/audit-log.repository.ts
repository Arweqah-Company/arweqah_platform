import type { AuditLogDto, AuditQuery, Paginated } from '@arweqah-platform/shared';
import type { ChainCheck } from './audit-chain';
import type { AuditLog } from './audit-log.entity';

export abstract class AuditLogRepository {
  /** Writes the entry at the end of the hash chain (one at a time, so the chain keeps its order). */
  abstract append(entry: Pick<AuditLog, 'actorId' | 'action' | 'entityType' | 'entityId' | 'changes' | 'ip'>): Promise<void>;
  /** Reads the chained entries in the order they were written and checks them; `limit` checks only the latest ones. */
  abstract verify(): Promise<ChainCheck>;
  abstract search(query: AuditQuery): Promise<Paginated<AuditLogDto>>;
}
