import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { RoleGroupRepository, type RoleGroupRecord, type RoleGroupValues } from '../domain/role-group.repository';

const SELECT_GROUPS = `SELECT g.id, g.name_ar AS "nameAr", g.name_en AS "nameEn", g.description,
    COALESCE((SELECT array_agg(gr.role_id) FROM role_group_roles gr WHERE gr.group_id = g.id), '{}') AS "roleIds",
    (SELECT count(*)::int FROM user_role_groups ug WHERE ug.group_id = g.id) AS "usersCount"
  FROM role_groups g`;
const ALL_GROUPS = `${SELECT_GROUPS} ORDER BY g.name_ar`;
const ONE_GROUP = `${SELECT_GROUPS} WHERE g.id = $1`;

@Injectable()
export class TypeOrmRoleGroupRepository extends RoleGroupRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  all(): Promise<RoleGroupRecord[]> {
    return this.ds.query(ALL_GROUPS);
  }

  async find(id: string): Promise<RoleGroupRecord | null> {
    return (await this.ds.query(ONE_GROUP, [id]))[0] ?? null;
  }

  async insert(values: RoleGroupValues): Promise<string> {
    return this.ds.transaction(async (m) => {
      const rows: { id: string }[] = await m.query('INSERT INTO role_groups (name_ar, name_en, description) VALUES ($1, $2, $3) RETURNING id', [values.nameAr, values.nameEn, values.description]);
      const id = (rows[0] as { id: string }).id;
      await this.setRoles(m, id, values.roleIds);
      return id;
    });
  }

  async update(id: string, values: RoleGroupValues): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('UPDATE role_groups SET name_ar = $2, name_en = $3, description = $4, updated_at = now() WHERE id = $1', [id, values.nameAr, values.nameEn, values.description]);
      await this.setRoles(m, id, values.roleIds);
    });
  }

  async remove(id: string): Promise<void> {
    await this.ds.query('DELETE FROM role_groups WHERE id = $1', [id]);
  }

  private async setRoles(m: EntityManager, groupId: string, roleIds: string[]): Promise<void> {
    await m.query('DELETE FROM role_group_roles WHERE group_id = $1', [groupId]);
    for (const roleId of new Set(roleIds)) await m.query('INSERT INTO role_group_roles (group_id, role_id) VALUES ($1, $2)', [groupId, roleId]);
  }
}
