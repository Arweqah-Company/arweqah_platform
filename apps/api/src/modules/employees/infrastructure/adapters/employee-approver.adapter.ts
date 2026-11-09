import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CareerApproverPort } from '../../../career-profile/domain/contracts/career-approver.port';
import type { ApproverUsers } from '../../../career-profile/domain/rules/development-request.rules';

/**
 * The three posts of one employee in one query: the direct manager, the head of the nearest sector above their unit (`org_node_closure`: depth 0 is
 * the unit itself) and the CEO, the head of the office that sits directly under the group (the Office of the CEO). A head is the employee in `org_nodes.manager_id`.
 */
const POSTS_SQL = `
SELECT
  (SELECT m.user_id FROM employees m WHERE m.id = e.manager_id AND m.deleted_at IS NULL) AS direct_user,
  (SELECT h.user_id FROM org_node_closure c
     JOIN org_nodes n ON n.id = c.ancestor_id AND n.deleted_at IS NULL
     JOIN org_levels l ON l.id = n.org_level_id AND l.template_code = 'sector'
     JOIN employees h ON h.id = n.manager_id AND h.deleted_at IS NULL
   WHERE c.descendant_id = e.org_node_id ORDER BY c.depth ASC LIMIT 1) AS sector_user,
  (SELECT h.user_id FROM org_nodes n
     JOIN org_levels l ON l.id = n.org_level_id AND l.template_code = 'office'
     JOIN employees h ON h.id = n.manager_id AND h.deleted_at IS NULL
   WHERE n.parent_id IS NULL AND n.deleted_at IS NULL ORDER BY n.sort_order ASC, n.id ASC LIMIT 1) AS ceo_user
FROM employees e WHERE e.id = $1 AND e.deleted_at IS NULL`;

@Injectable()
export class EmployeeApproverAdapter extends CareerApproverPort {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async usersFor(employeeId: string): Promise<ApproverUsers> {
    const rows: { direct_user: string | null; sector_user: string | null; ceo_user: string | null }[] = await this.ds.query(POSTS_SQL, [employeeId]);
    const row = rows[0];
    return { direct: row?.direct_user ?? null, sector: row?.sector_user ?? null, ceo: row?.ceo_user ?? null };
  }
}
