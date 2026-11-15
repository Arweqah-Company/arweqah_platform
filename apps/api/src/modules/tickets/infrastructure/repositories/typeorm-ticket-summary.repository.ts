import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TicketSummaryCounts, TicketSummaryRepository, TicketSummaryRow } from '../../domain/contracts/ticket-summary.repository';

const ROW = `t.id, t.number::text AS number, t.title, t.status, to_char(t.needed_by, 'YYYY-MM-DD') AS "neededBy", t.desk_id AS "deskId", t.is_personal AS "isPersonal"`;

/** A ticket waits for $1 when it is theirs to handle (assignee, or desk manager while nobody is assigned; never someone else's personal ticket) and they did not write its last event. */
const WAITING = `t.status = 'open'
  AND (t.assignee_user_id = $1 OR (t.assignee_user_id IS NULL AND NOT t.is_personal AND dm.user_id = $1))
  AND (SELECT e.actor_user_id FROM ticket_events e WHERE e.ticket_id = t.id ORDER BY e.created_at DESC, e.id DESC LIMIT 1) IS DISTINCT FROM $1`;
const DESK = `JOIN org_nodes n ON n.id = t.desk_id LEFT JOIN employees dm ON dm.id = n.manager_id AND dm.deleted_at IS NULL`;

const WAITING_COUNT = `SELECT count(*)::int AS n FROM tickets t ${DESK} WHERE ${WAITING}`;

@Injectable()
export class TypeOrmTicketSummaryRepository extends TicketSummaryRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async counts(userId: string): Promise<TicketSummaryCounts> {
    const sent: { sentOpen: number; awaitingMyConfirmation: number }[] = await this.ds.query(
      `SELECT count(*) FILTER (WHERE t.status <> 'closed')::int AS "sentOpen", count(*) FILTER (WHERE t.status = 'close_requested')::int AS "awaitingMyConfirmation"
       FROM tickets t WHERE t.sender_user_id = $1`,
      [userId],
    );
    const waiting: { n: number }[] = await this.ds.query(WAITING_COUNT, [userId]);
    return { sentOpen: sent[0]?.sentOpen ?? 0, awaitingMyConfirmation: sent[0]?.awaitingMyConfirmation ?? 0, awaitingMyReply: waiting[0]?.n ?? 0 };
  }

  sent(userId: string, limit: number): Promise<TicketSummaryRow[]> {
    return this.ds.query(
      `SELECT ${ROW} FROM tickets t WHERE t.sender_user_id = $1 AND t.status <> 'closed' ORDER BY (t.status = 'close_requested') DESC, t.needed_by, t.id LIMIT ${Math.trunc(limit)}`,
      [userId],
    );
  }

  waiting(userId: string, limit: number): Promise<TicketSummaryRow[]> {
    const sql = `SELECT ${ROW} FROM tickets t ${DESK} WHERE ${WAITING} ORDER BY t.needed_by, t.id LIMIT ${Math.trunc(limit)}`;
    return this.ds.query(sql, [userId]);
  }
}
