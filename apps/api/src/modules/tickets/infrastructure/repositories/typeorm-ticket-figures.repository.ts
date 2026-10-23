import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TicketFiguresRepository } from '../../domain/contracts/ticket-figures.repository';
import type { DeskFigureRows, TicketRow } from '../../domain/types/ticket.types';
import { ticketQuery, toTicketRow } from './ticket-sql';

const NEEDS_ATTENTION = ticketQuery(
  `t.desk_id = $1 AND NOT t.is_personal AND t.status <> 'closed'
   AND (t.needed_by < $2::date OR (t.status = 'open' AND t.last_activity_at <= $3::timestamptz - (d.stale_after_days * interval '1 day')))`,
  'ORDER BY t.needed_by, t.id LIMIT 50',
);

/** Average hours between two timestamps of the same ticket. */
const avgHours = (to: string, from: string, only: string): string => `avg(EXTRACT(EPOCH FROM ${to} - ${from}) / 3600) FILTER (WHERE ${only})`;
const hours = (v: string | null): number | null => (v === null ? null : Math.round(Number(v) * 10) / 10);

@Injectable()
export class TypeOrmTicketFiguresRepository extends TicketFiguresRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async deskFigures(deskId: string, since: Date): Promise<DeskFigureRows> {
    const [totals, outcomes, byType, byAssignee] = await Promise.all([this.totals(deskId, since), this.outcomes(deskId, since), this.byType(deskId, since), this.byAssignee(deskId, since)]);
    return { ...totals, outcomes, byType, byAssignee };
  }

  private async totals(deskId: string, since: Date): Promise<Pick<DeskFigureRows, 'openNow' | 'incoming' | 'personalCount' | 'avgFirstResponseHours' | 'avgResolutionHours'>> {
    const rows = await this.ds.query(
      `SELECT count(*) FILTER (WHERE status <> 'closed')::int AS "openNow",
              count(*) FILTER (WHERE created_at >= $2)::int AS incoming,
              count(*) FILTER (WHERE created_at >= $2 AND is_personal)::int AS "personalCount",
              ${avgHours('first_response_at', 'created_at', 'created_at >= $2 AND first_response_at IS NOT NULL')} AS "firstResponse",
              ${avgHours('closed_at', 'created_at', 'created_at >= $2 AND closed_at IS NOT NULL')} AS resolution
       FROM tickets WHERE desk_id = $1`,
      [deskId, since],
    );
    const t = rows[0] ?? {};
    return { openNow: t.openNow ?? 0, incoming: t.incoming ?? 0, personalCount: t.personalCount ?? 0, avgFirstResponseHours: hours(t.firstResponse ?? null), avgResolutionHours: hours(t.resolution ?? null) };
  }

  private async outcomes(deskId: string, since: Date): Promise<DeskFigureRows['outcomes']> {
    const rows = await this.ds.query(
      `SELECT count(*) FILTER (WHERE close_reason = 'confirmed' AND closed_at >= $2)::int AS confirmed,
              count(*) FILTER (WHERE close_reason = 'auto' AND closed_at >= $2)::int AS auto,
              count(*) FILTER (WHERE close_reason = 'not_executed' AND closed_at >= $2)::int AS "notExecuted",
              (SELECT count(*)::int FROM ticket_events ev JOIN tickets x ON x.id = ev.ticket_id WHERE x.desk_id = $1 AND ev.type = 'reopened' AND ev.created_at >= $2) AS reopened
       FROM tickets WHERE desk_id = $1`,
      [deskId, since],
    );
    return rows[0] ?? { confirmed: 0, auto: 0, notExecuted: 0, reopened: 0 };
  }

  private byType(deskId: string, since: Date): Promise<DeskFigureRows['byType']> {
    return this.ds.query(
      `SELECT ty.id AS "typeId", ty.name_ar AS "nameAr", ty.name_en AS "nameEn", count(t.id)::int AS count
       FROM ticket_types ty LEFT JOIN tickets t ON t.type_id = ty.id AND t.created_at >= $2
       WHERE ty.desk_id = $1 GROUP BY ty.id ORDER BY count DESC, ty.name_ar`,
      [deskId, since],
    );
  }

  private async byAssignee(deskId: string, since: Date): Promise<DeskFigureRows['byAssignee']> {
    const rows: { userId: string | null; name: string | null; open: number; closed: number; firstResponse: string | null }[] = await this.ds.query(
      `SELECT t.assignee_user_id AS "userId", COALESCE(e.full_name, u.name) AS name,
              count(*) FILTER (WHERE t.status <> 'closed')::int AS open,
              count(*) FILTER (WHERE t.status = 'closed' AND t.closed_at >= $2)::int AS closed,
              ${avgHours('t.first_response_at', 't.created_at', 't.created_at >= $2 AND t.first_response_at IS NOT NULL')} AS "firstResponse"
       FROM tickets t LEFT JOIN users u ON u.id = t.assignee_user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
       WHERE t.desk_id = $1 GROUP BY t.assignee_user_id, e.full_name, u.name ORDER BY open DESC, name NULLS LAST`,
      [deskId, since],
    );
    return rows.map((r) => ({ userId: r.userId, name: r.name, open: r.open, closed: r.closed, avgFirstResponseHours: hours(r.firstResponse) }));
  }

  async needsAttention(deskId: string, today: string, now: Date): Promise<TicketRow[]> {
    const rows = await this.ds.query(NEEDS_ATTENTION, [deskId, today, now]);
    return rows.map(toTicketRow);
  }
}
