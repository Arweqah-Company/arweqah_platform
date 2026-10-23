import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrgNodeDependentsPort } from '../../../org/domain/contracts/org-node-dependents.port';

/** A department is in use while its desk receives tickets (active or paused) or any of its tickets is not closed. */
const UNITS_IN_USE = `SELECT d.org_node_id AS id FROM ticket_desks d
  WHERE d.org_node_id = ANY($1)
    AND (d.reception_status <> 'stopped' OR EXISTS (SELECT 1 FROM tickets t WHERE t.desk_id = d.org_node_id AND t.status <> 'closed'))`;

@Injectable()
export class TicketOrgNodeDependentsAdapter extends OrgNodeDependentsPort {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async unitsInUse(nodeIds: string[]): Promise<string[]> {
    if (!nodeIds.length) return [];
    const rows = await this.ds.query<{ id: string }[]>(UNITS_IN_USE, [nodeIds]);
    return rows.map((r) => r.id);
  }
}
