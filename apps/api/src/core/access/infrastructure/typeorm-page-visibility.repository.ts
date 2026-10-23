import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PageVisibilityRepository } from '../domain/page-visibility.repository';

const HIDDEN_FOR_USER = `SELECT r.page_key AS key FROM page_visibility_rules r
  JOIN user_roles ur ON ur.role_id = r.role_id AND ur.user_id = $1
  GROUP BY r.page_key
  HAVING count(*) = (SELECT count(*) FROM user_roles WHERE user_id = $1)`;

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
