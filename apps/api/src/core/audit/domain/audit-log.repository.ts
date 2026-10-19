import type { AuditLogDto, AuditQuery, Paginated } from '@arweqah-platform/shared';
import type { AuditLog } from './audit-log.entity';

export abstract class AuditLogRepository {
  abstract append(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void>;
  abstract search(query: AuditQuery): Promise<Paginated<AuditLogDto>>;
}
