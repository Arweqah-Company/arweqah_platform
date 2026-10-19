import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuditLogDto, AuditQuery, Paginated } from '@arweqah-platform/shared';
import { AuditLog } from '../domain/audit-log.entity';
import { AuditLogRepository } from '../domain/audit-log.repository';

interface AuditRow extends AuditLog {
  actorName: string | null;
}

@Injectable()
export class TypeOrmAuditLogRepository extends AuditLogRepository {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {
    super();
  }

  async append(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    await this.repo.insert(entry as never);
  }

  async search(query: AuditQuery): Promise<Paginated<AuditLogDto>> {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoin('users', 'u', 'u.id = a.actor_id')
      .addSelect('u.name', 'a_actorName')
      .orderBy('a.created_at', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (query.action) qb.andWhere('a.action = :action', { action: query.action });
    if (query.actorId) qb.andWhere('a.actor_id = :actorId', { actorId: query.actorId });
    if (query.entityType) qb.andWhere('a.entity_type = :entityType', { entityType: query.entityType });
    const [{ entities, raw }, total] = await Promise.all([qb.getRawAndEntities(), qb.getCount()]);
    const names = new Map(raw.map((r: { a_id: string; a_actorName: string | null }) => [r.a_id, r.a_actorName]));
    const items = entities.map((e) => toDto({ ...e, actorName: names.get(e.id) ?? null }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}

function toDto(row: AuditRow): AuditLogDto {
  return {
    id: row.id,
    actorId: row.actorId,
    actorName: row.actorName,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    changes: row.changes,
    ip: row.ip,
    createdAt: row.createdAt.toISOString(),
  };
}
