import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TaskTicketParticipants } from '../../domain/contracts/task-ticket-participants.port';

/** Read-only SQL over the ticket tables: the sender, the assignee and the manager of the desk of an open ticket (a personal ticket has nobody else). */
const SHARED = `SELECT EXISTS (
  SELECT 1 FROM tickets t
  JOIN org_nodes n ON n.id = t.desk_id
  LEFT JOIN employees dm ON dm.id = n.manager_id AND dm.deleted_at IS NULL
  WHERE t.status <> 'closed' AND NOT t.is_personal
    AND $1 IN (t.sender_user_id, t.assignee_user_id, dm.user_id)
    AND $2 IN (t.sender_user_id, t.assignee_user_id, dm.user_id)
) AS yes`;

@Injectable()
export class TypeOrmTaskTicketParticipants extends TaskTicketParticipants {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async shareOpenTicket(userA: string, userB: string): Promise<boolean> {
    const rows: { yes: boolean }[] = await this.ds.query(SHARED, [userA, userB]);
    return rows[0]?.yes ?? false;
  }
}
