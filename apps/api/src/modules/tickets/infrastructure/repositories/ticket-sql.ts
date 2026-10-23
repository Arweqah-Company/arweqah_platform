import type { TicketRow } from '../../domain/types/ticket.types';

/** One ticket with the names and the desk settings the rules and screens need. The desk manager is the manager of the department's node. */
export const TICKET_SELECT = `
  SELECT t.id, t.number::int AS number, t.sender_user_id AS "senderUserId", COALESCE(se.full_name, su.name) AS "senderName",
         t.desk_id AS "deskId", t.type_id AS "typeId", ty.name_ar AS "typeNameAr", ty.name_en AS "typeNameEn",
         t.title, t.details, t.priority, to_char(t.needed_by, 'YYYY-MM-DD') AS "neededBy",
         t.assignee_user_id AS "assigneeUserId", COALESCE(ae.full_name, au.name) AS "assigneeName", t.is_personal AS "isPersonal",
         t.status, t.close_reason AS "closeReason", t.first_response_at AS "firstResponseAt", t.close_requested_at AS "closeRequestedAt",
         t.closed_at AS "closedAt", t.last_activity_at AS "lastActivityAt", t.reopen_count AS "reopenCount", t.stale_notified_at AS "staleNotifiedAt",
         t.revision, t.created_at AS "createdAt", dm.user_id AS "deskManagerUserId",
         se.org_node_id AS "senderNodeId", se.company_id AS "senderCompanyId", ae.org_node_id AS "assigneeNodeId", ae.company_id AS "assigneeCompanyId", n.company_id AS "deskCompanyId",
         d.stale_after_days AS "deskStaleAfterDays", d.reopen_window_days AS "deskReopenWindowDays", d.auto_close_days AS "deskAutoCloseDays"
  FROM tickets t
  JOIN ticket_types ty ON ty.id = t.type_id
  JOIN ticket_desks d ON d.org_node_id = t.desk_id
  JOIN org_nodes n ON n.id = t.desk_id
  LEFT JOIN employees dm ON dm.id = n.manager_id AND dm.deleted_at IS NULL
  JOIN users su ON su.id = t.sender_user_id
  LEFT JOIN employees se ON se.user_id = su.id AND se.deleted_at IS NULL
  LEFT JOIN users au ON au.id = t.assignee_user_id
  LEFT JOIN employees ae ON ae.user_id = au.id AND ae.deleted_at IS NULL`;

interface RawTicket extends Omit<TicketRow, 'priority'> {
  priority: number;
}

export const toTicketRow = (r: RawTicket): TicketRow => ({ ...r, priority: r.priority === 1 ? 1 : 0 });

/** The ticket query with a fixed WHERE fragment (placeholders only, never user text) and a fixed tail such as ORDER BY / LIMIT. */
export const ticketQuery = (where: string, tail = ''): string => `${TICKET_SELECT} WHERE ${where} ${tail}`.trim();
