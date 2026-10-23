import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PageVisibilityRepository } from '../domain/page-visibility.repository';

/** The roles of a person: given directly or through a group. */
const ROLES_OF_USER = `SELECT role_id FROM user_roles WHERE user_id = $1
  UNION SELECT gr.role_id FROM user_role_groups ug JOIN role_group_roles gr ON gr.group_id = ug.group_id WHERE ug.user_id = $1`;
const HIDDEN_FOR_USER = `SELECT r.page_key AS key FROM page_visibility_rules r
  WHERE r.role_id IN (${ROLES_OF_USER})
  GROUP BY r.page_key
  HAVING count(*) = (SELECT count(*) FROM (${ROLES_OF_USER}) x)
  ORDER BY r.page_key`;

@Injectable()
export class TypeOrmPageVisibilityRepository extends PageVisibilityRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async hiddenForUser(userId: string): Promise<string[]> {
    const rows = await this.ds.query<{ key: string }[]>(HIDDEN_FOR_USER, [userId]);
    return rows.map((r) => r.key);
  }

  async allRules(): Promise<Map<string, string[]>> {
    const rows = await this.ds.query<{ role_id: string; page_key: string }[]>('SELECT role_id, page_key FROM page_visibility_rules ORDER BY page_key');
    const byRole = new Map<string, string[]>();
    for (const row of rows) byRole.set(row.role_id, [...(byRole.get(row.role_id) ?? []), row.page_key]);
    return byRole;
  }

  async replaceForRole(roleId: string, pageKeys: string[]): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('DELETE FROM page_visibility_rules WHERE role_id = $1', [roleId]);
      for (const key of pageKeys) await m.query('INSERT INTO page_visibility_rules (role_id, page_key) VALUES ($1, $2)', [roleId, key]);
    });
  }
}
