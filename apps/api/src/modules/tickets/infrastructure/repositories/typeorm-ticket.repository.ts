import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { Paginated, TicketGrouping } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { returnedRows } from '../../../../common/infrastructure/query-result';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import type {
  AttachmentRow,
  FilterOptionsRows,
  NewEvent,
  NewTicket,
  TicketEventRow,
  TicketListFilters,
  TicketPatch,
  TicketRow,
  TicketViewer,
  ViewerScope,
} from '../../domain/types/ticket.types';
import { ticketQuery, toTicketRow } from './ticket-sql';

const ORDER_BY_GROUP: Record<TicketGrouping, string> = {
  assignee: `COALESCE(ae.full_name, au.name) NULLS LAST, `,
  status: `t.status, `,
  desk: `t.desk_id, `,
  type: `ty.name_ar, `,
};

/** Where each kind of scope looks: the people of a ticket (sender, assignee) or its desk. */
const PEOPLE_COLUMNS = { node: ['se.org_node_id', 'ae.org_node_id'], company: ['se.company_id', 'ae.company_id', 'n.company_id'] };
const DESK_COLUMNS = { node: ['t.desk_id'], company: ['n.company_id'] };

/** SQL for "inside this scope" (the value is added to `values`); a scope that reaches nothing is FALSE. */
function scopeSql(scope: ViewerScope, columns: { node: string[]; company: string[] }, values: unknown[]): string {
  if (scope.kind === 'all') return 'TRUE';
  if (scope.kind === 'none') return 'FALSE';
  values.push(scope.kind === 'company' ? scope.companyId : [...scope.ids]);
  const p = `$${values.length}`;
  return scope.kind === 'company' ? `(${columns.company.map((c) => `${c} = ${p}`).join(' OR ')})` : `(${columns.node.map((c) => `${c} = ANY(${p})`).join(' OR ')})`;
}

/** A ticket is in the viewer's inbox as its assignee, as the manager of its desk, or when its desk is one they may handle (never a personal one except for its assignee). */
const inboxSql = (viewer: TicketViewer, values: unknown[]): string => `(t.assignee_user_id = $1 OR (NOT t.is_personal AND (dm.user_id = $1 OR ${scopeSql(viewer.handle, DESK_COLUMNS, values)})))`;

/** A ticket is in the viewer's team tab when its sender or assignee is inside the scope of their view permission (never a personal one). */
const teamSql = (viewer: TicketViewer, values: unknown[]): string => `($1::uuid IS NOT NULL AND NOT t.is_personal AND ${scopeSql(viewer.view, PEOPLE_COLUMNS, values)})` // $1 (the viewer) is always bound, so it must always be used;

/** The employees of a ticket's sender and assignee, for the people-based scope. */
const PEOPLE_JOINS = `LEFT JOIN employees se ON se.user_id = t.sender_user_id AND se.deleted_at IS NULL LEFT JOIN employees ae ON ae.user_id = t.assignee_user_id AND ae.deleted_at IS NULL`;

const HAS_INBOX = `SELECT (EXISTS (SELECT 1 FROM ticket_types WHERE default_assignee_user_id = $1)
  OR EXISTS (SELECT 1 FROM ticket_desks d JOIN org_nodes n ON n.id = d.org_node_id JOIN employees e ON e.id = n.manager_id AND e.deleted_at IS NULL WHERE e.user_id = $1)) AS yes`;

const STALE = ticketQuery(`t.status = 'open' AND t.last_activity_at <= $1::timestamptz - (d.stale_after_days * interval '1 day')
  AND (t.stale_notified_at IS NULL OR t.stale_notified_at < t.last_activity_at)`);

@Injectable()
export class TypeOrmTicketRepository extends TicketRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async insert(d: NewTicket, tx: TransactionContext): Promise<string> {
    const rows: { id: string }[] = await this.m(tx).query(
      `INSERT INTO tickets (sender_user_id, desk_id, type_id, title, details, priority, needed_by, assignee_user_id, is_personal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [d.senderUserId, d.deskId, d.typeId, d.title, d.details, d.priority, d.neededBy, d.assigneeUserId, d.isPersonal],
    );
    return rows[0]?.id as string;
  }

  async appendEvent(e: NewEvent, tx: TransactionContext): Promise<string> {
    const m = this.m(tx);
    const rows: { id: string }[] = await m.query('INSERT INTO ticket_events (ticket_id, type, actor_user_id, body) VALUES ($1, $2, $3, $4) RETURNING id', [e.ticketId, e.type, e.actorUserId, e.body]);
    const id = rows[0]?.id as string;
    for (const fileId of e.fileIds) await m.query('INSERT INTO ticket_attachments (event_id, file_id) VALUES ($1, $2)', [id, fileId]);
    return id;
  }

  async find(id: string, tx?: TransactionContext): Promise<TicketRow | null> {
    const rows = await this.m(tx).query(ticketQuery('t.id = $1'), [id]);
    return rows[0] ? toTicketRow(rows[0]) : null;
  }

  async patch(id: string, expectedRevision: number, p: TicketPatch, tx: TransactionContext): Promise<boolean> {
    const sets = ['revision = revision + 1', 'updated_at = now()'];
    const values: unknown[] = [id, expectedRevision];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (p.status !== undefined) set('status', p.status);
    if (p.closeReason !== undefined) set('close_reason', p.closeReason);
    if (p.firstResponseAt !== undefined) set('first_response_at', p.firstResponseAt);
    if (p.closeRequestedAt !== undefined) set('close_requested_at', p.closeRequestedAt);
    if (p.closedAt !== undefined) set('closed_at', p.closedAt);
    if (p.lastActivityAt !== undefined) set('last_activity_at', p.lastActivityAt);
    if (p.reopenCountIncrement) sets.push('reopen_count = reopen_count + 1');
    const sql = `UPDATE tickets SET ${sets.join(', ')} WHERE id = $1 AND revision = $2 RETURNING id`; // column names are fixed above, values are parameters
    const result = await this.m(tx).query(sql, values);
    return returnedRows<{ id: string }>(result).length === 1;
  }

  /** The WHERE clause of a list (the viewer is $1) and its values. */
  private listWhere(f: TicketListFilters): { clause: string; values: unknown[] } {
    const values: unknown[] = [f.viewer.userId];
    const first = { mine: 't.sender_user_id = $1', inbox: inboxSql(f.viewer, values), team: teamSql(f.viewer, values) }[f.tab];
    const where: string[] = [first];
    const add = (column: string, value: unknown) => {
      values.push(value);
      where.push(`${column} = $${values.length}`);
    };
    if (f.deskId) add('t.desk_id', f.deskId);
    if (f.typeId) add('t.type_id', f.typeId);
    if (f.assigneeId) add('t.assignee_user_id', f.assigneeId);
    if (f.status) add('t.status', f.status);
    if (f.search) {
      values.push(likeContains(f.search));
      const p = `$${values.length}`;
      where.push(`(t.title ILIKE ${p} OR t.details ILIKE ${p} OR ('TKT-' || lpad(t.number::text, 6, '0')) ILIKE ${p})`);
    }
    return { clause: where.join(' AND '), values };
  }

  async list(f: TicketListFilters): Promise<Paginated<TicketRow> & { groupBy: TicketGrouping | null }> {
    const { clause, values } = this.listWhere(f);
    const order = `${f.groupBy ? ORDER_BY_GROUP[f.groupBy] : ''}t.last_activity_at DESC, t.id`;
    const page = [...values, f.pageSize, (f.page - 1) * f.pageSize];
    const listSql = ticketQuery(clause, `ORDER BY ${order} LIMIT $${page.length - 1} OFFSET $${page.length}`);
    const countSql = `SELECT count(*)::int AS n FROM tickets t JOIN ticket_types ty ON ty.id = t.type_id JOIN org_nodes n ON n.id = t.desk_id LEFT JOIN employees dm ON dm.id = n.manager_id AND dm.deleted_at IS NULL ${PEOPLE_JOINS} WHERE ${clause}`;
    const [rows, count] = await Promise.all([this.ds.query(listSql, page), this.ds.query(countSql, values)]);
    return { items: rows.map(toTicketRow), total: count[0]?.n ?? 0, page: f.page, pageSize: f.pageSize, groupBy: f.groupBy ?? null };
  }

  async events(ticketId: string): Promise<TicketEventRow[]> {
    return this.ds.query(
      `SELECT ev.id, ev.type, ev.actor_user_id AS "actorUserId", COALESCE(e.full_name, u.name) AS "actorName", ev.body, ev.created_at AS "createdAt"
       FROM ticket_events ev LEFT JOIN users u ON u.id = ev.actor_user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
       WHERE ev.ticket_id = $1 ORDER BY ev.created_at, ev.id`,
      [ticketId],
    );
  }

  attachments(eventIds: string[]): Promise<AttachmentRow[]> {
    if (!eventIds.length) return Promise.resolve([]);
    return this.ds.query(
      `SELECT a.event_id AS "eventId", a.file_id AS "fileId", f.original_name AS "originalName", f.content_type AS "contentType", f.size
       FROM ticket_attachments a JOIN files f ON f.id = a.file_id WHERE a.event_id = ANY($1) ORDER BY f.original_name`,
      [eventIds],
    );
  }

  async attachedFile(ticketId: string, fileId: string): Promise<boolean> {
    const rows = await this.ds.query('SELECT 1 FROM ticket_attachments a JOIN ticket_events ev ON ev.id = a.event_id WHERE ev.ticket_id = $1 AND a.file_id = $2 LIMIT 1', [ticketId, fileId]);
    return rows.length > 0;
  }

  async filterOptions(viewer: TicketViewer): Promise<FilterOptionsRows> {
    const values: unknown[] = [viewer.userId];
    const inbox = inboxSql(viewer, values);
    const team = teamSql(viewer, values);
    const visible = `FROM tickets t JOIN org_nodes n ON n.id = t.desk_id LEFT JOIN employees dm ON dm.id = n.manager_id AND dm.deleted_at IS NULL ${PEOPLE_JOINS} WHERE (t.sender_user_id = $1 OR ${inbox} OR ${team})`;
    const desksSql = `SELECT DISTINCT t.desk_id AS id ${visible}`;
    const typesSql = `SELECT ty.id, ty.desk_id AS "deskId", ty.name_ar AS "nameAr", ty.name_en AS "nameEn" FROM ticket_types ty WHERE ty.id IN (SELECT t.type_id ${visible}) ORDER BY ty.name_ar`;
    const assigneeValues: unknown[] = [viewer.userId];
    const assigneesSql = `SELECT DISTINCT u.id, COALESCE(e.full_name, u.name) AS name FROM tickets t JOIN org_nodes n ON n.id = t.desk_id LEFT JOIN employees dm ON dm.id = n.manager_id AND dm.deleted_at IS NULL
      JOIN users u ON u.id = t.assignee_user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE ${inboxSql(viewer, assigneeValues)} ORDER BY name`;
    const [desks, types, assignees, inboxRow] = await Promise.all([
      this.ds.query(desksSql, values),
      this.ds.query(typesSql, values),
      this.ds.query(assigneesSql, assigneeValues),
      this.ds.query(HAS_INBOX, [viewer.userId]),
    ]);
    return { desks: desks.map((d: { id: string }) => d.id), types, assignees, hasInbox: !!inboxRow[0]?.yes || viewer.handle.kind !== 'none', hasTeam: viewer.view.kind !== 'none' };
  }

  async staleCandidates(now: Date): Promise<TicketRow[]> {
    const rows = await this.ds.query(STALE, [now]);
    return rows.map(toTicketRow);
  }

  async markStaleNotified(ids: string[], at: Date): Promise<void> {
    if (ids.length) await this.ds.query('UPDATE tickets SET stale_notified_at = $2 WHERE id = ANY($1)', [ids, at]);
  }

  async reassignOrphanedPersonal(typeId: string, newAssigneeUserId: string, tx: TransactionContext): Promise<number> {
    const result = await this.m(tx).query(
      `UPDATE tickets t SET assignee_user_id = $2, revision = revision + 1, updated_at = now()
       WHERE t.type_id = $1 AND t.is_personal AND t.status <> 'closed'
         AND (t.assignee_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users a WHERE a.id = t.assignee_user_id AND a.is_active))
       RETURNING t.id`,
      [typeId, newAssigneeUserId],
    );
    return returnedRows<{ id: string }>(result).length;
  }

  async orphanedPersonalCount(deskId: string): Promise<number> {
    const rows = await this.ds.query(
      `SELECT count(*)::int AS n FROM tickets t WHERE t.desk_id = $1 AND t.is_personal AND t.status <> 'closed'
         AND (t.assignee_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users a WHERE a.id = t.assignee_user_id AND a.is_active))`,
      [deskId],
    );
    return rows[0]?.n ?? 0;
  }
}
