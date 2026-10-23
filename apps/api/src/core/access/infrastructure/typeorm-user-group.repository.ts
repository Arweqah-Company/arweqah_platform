import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { UserGroupRepository, type UserGroupRecord, type UserGroupValues } from '../domain/user-group.repository';

const SELECT_GROUPS = `SELECT g.id, g.name_ar AS "nameAr", g.name_en AS "nameEn", g.description,
    COALESCE((SELECT json_agg(json_build_object('id', m.user_id, 'name', COALESCE(e.full_name, u.name)) ORDER BY COALESCE(e.full_name, u.name))
      FROM user_group_members m JOIN users u ON u.id = m.user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
      WHERE m.group_id = g.id), '[]') AS members
  FROM user_groups g`;
const ALL_GROUPS = `${SELECT_GROUPS} ORDER BY g.name_ar`;
const ONE_GROUP = `${SELECT_GROUPS} WHERE g.id = $1`;

@Injectable()
export class TypeOrmUserGroupRepository extends UserGroupRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  all(): Promise<UserGroupRecord[]> {
    return this.ds.query(ALL_GROUPS);
  }

  async find(id: string): Promise<UserGroupRecord | null> {
    return (await this.ds.query(ONE_GROUP, [id]))[0] ?? null;
  }

  async insert(values: UserGroupValues): Promise<string> {
    return this.ds.transaction(async (m) => {
      const rows: { id: string }[] = await m.query('INSERT INTO user_groups (name_ar, name_en, description) VALUES ($1, $2, $3) RETURNING id', [values.nameAr, values.nameEn, values.description]);
      const id = (rows[0] as { id: string }).id;
      await this.setMembers(m, id, values.userIds);
      return id;
    });
  }

  async update(id: string, values: UserGroupValues): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('UPDATE user_groups SET name_ar = $2, name_en = $3, description = $4, updated_at = now() WHERE id = $1', [id, values.nameAr, values.nameEn, values.description]);
      await this.setMembers(m, id, values.userIds);
    });
  }

  async remove(id: string): Promise<void> {
    await this.ds.query('DELETE FROM user_groups WHERE id = $1', [id]);
  }

  async existingUsers(userIds: string[]): Promise<string[]> {
    if (!userIds.length) return [];
    return (await this.ds.query<{ id: string }[]>('SELECT id FROM users WHERE id = ANY($1)', [userIds])).map((r) => r.id);
  }

  private async setMembers(m: EntityManager, groupId: string, userIds: string[]): Promise<void> {
    await m.query('DELETE FROM user_group_members WHERE group_id = $1', [groupId]);
    for (const userId of new Set(userIds)) await m.query('INSERT INTO user_group_members (group_id, user_id) VALUES ($1, $2)', [groupId, userId]);
  }
}
