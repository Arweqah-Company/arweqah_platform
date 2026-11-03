import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import { actionsMatchingText, prefixPatterns, actionsOfCategory, AUDIT_ACTIONS, categoryOfAction, type AuditLogDto, type AuditQuery, type Paginated } from '@arweqah-platform/shared';
import { randomUUID } from 'node:crypto';
import { chainHash, verifyChain, type ChainCheck } from '../domain/audit-chain';
import { AuditLog } from '../domain/audit-log.entity';
import { AuditLogRepository } from '../domain/audit-log.repository';
import { escapeLike } from '../../../common/infrastructure/sql-like';


/** The lock the writers of the audit chain take, so entries are chained one after the other. */
const CHAIN_LOCK = 7_301_001;

interface AuditRow extends AuditLog {
  actorName: string | null;
}

@Injectable()
export class TypeOrmAuditLogRepository extends AuditLogRepository {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {
    super();
  }

  async append(entry: Pick<AuditLog, 'actorId' | 'action' | 'entityType' | 'entityId' | 'changes' | 'ip'>): Promise<void> {
    await this.repo.manager.transaction(async (m) => {
      // One writer at a time: the hash of an entry needs the hash of the one before it.
      await m.query('SELECT pg_advisory_xact_lock($1)', [CHAIN_LOCK]);
      const last: { hash: string }[] = await m.query('SELECT hash FROM audit_logs WHERE hash IS NOT NULL ORDER BY seq DESC LIMIT 1');
      const previous = last[0]?.hash ?? null;
      // What is hashed is what the database will hold: plain JSON (a date becomes its text, an undefined key goes).
      const changes: Record<string, unknown> | null = entry.changes === null ? null : (JSON.parse(JSON.stringify(entry.changes)) as Record<string, unknown>);
      const stamped = { ...entry, changes, id: randomUUID(), createdAt: new Date() };
      await m.query(
        'INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, changes, ip, created_at, prev_hash, hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [stamped.id, entry.actorId, entry.action, entry.entityType, entry.entityId, changes === null ? null : JSON.stringify(changes), entry.ip, stamped.createdAt, previous, chainHash(previous, stamped)],
      );
    });
  }

  async verify(): Promise<ChainCheck> {
    const rows: { seq: string; id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; changes: Record<string, unknown> | null; ip: string | null; created_at: Date; prev_hash: string | null; hash: string }[] =
      await this.repo.manager.query('SELECT seq, id, actor_id, action, entity_type, entity_id, changes, ip, created_at, prev_hash, hash FROM audit_logs WHERE hash IS NOT NULL ORDER BY seq');
    return verifyChain(rows.map((r) => ({ seq: r.seq, id: r.id, actorId: r.actor_id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, changes: r.changes, ip: r.ip, createdAt: r.created_at, prevHash: r.prev_hash, hash: r.hash })));
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
    if (query.category) filterByCategory(qb, query.category);
    if (query.search) searchText(qb, query.search);
    if (query.actor) qb.andWhere('(u.name ILIKE :actor OR u.email ILIKE :actor)', { actor: `%${escapeLike(query.actor)}%` });
    if (query.from) qb.andWhere('a.created_at >= :from', { from: `${query.from}T00:00:00.000Z` });
    if (query.to) qb.andWhere("a.created_at < (:to::date + 1)", { to: query.to });
    const [{ entities, raw }, total] = await Promise.all([qb.getRawAndEntities(), qb.getCount()]);
    const names = new Map(raw.map((r: { a_id: string; a_actorName: string | null }) => [r.a_id, r.a_actorName]));
    const items = entities.map((e) => toDto({ ...e, actorName: names.get(e.id) ?? null }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}

/** The category's listed actions, and unlisted ones its first word explains; "other" is everything neither covers. */
function filterByCategory(qb: SelectQueryBuilder<AuditLog>, category: NonNullable<AuditQuery['category']>): void {
  if (category === 'other') {
    qb.andWhere('a.action NOT IN (:...known) AND a.action NOT LIKE ALL(ARRAY[:...allPrefixes])', { known: Object.keys(AUDIT_ACTIONS), allPrefixes: prefixPatterns() });
    return;
  }
  qb.andWhere('(a.action IN (:...inCategory) OR a.action LIKE ANY(ARRAY[:...prefixes]))', { inCategory: actionsOfCategory(category), prefixes: prefixPatterns(category) });
}

/** The box finds what the person reads (the action's text in either language) and the person's name, besides the record id. */
function searchText(qb: SelectQueryBuilder<AuditLog>, search: string): void {
  const matching = actionsMatchingText(search);
  qb.andWhere(`(${matching.length ? 'a.action IN (:...byText) OR ' : ''}a.entity_id ILIKE :term OR u.name ILIKE :term OR u.email ILIKE :term)`, { byText: matching, term: `%${escapeLike(search)}%` });
}

function toDto(row: AuditRow): AuditLogDto {
  return {
    id: row.id,
    actorId: row.actorId,
    actorName: row.actorName,
    action: row.action,
    category: categoryOfAction(row.action),
    entityType: row.entityType,
    entityId: row.entityId,
    changes: row.changes,
    ip: row.ip,
    createdAt: row.createdAt.toISOString(),
  };
}
