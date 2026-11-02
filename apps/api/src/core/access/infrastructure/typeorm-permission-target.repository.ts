import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { PermissionGrant, PermissionScope, PermissionTargetKind } from '@arweqah-platform/shared';
import { likeContains } from '../../../common/infrastructure/sql-like';
import { PermissionTargetRepository, type TargetRef } from '../domain/permission-target.repository';

/** Where each kind keeps its names and its own permissions: fixed SQL, never built from input. */
const KINDS = {
  role: {
    list: 'SELECT id, name_ar AS "nameAr", name_en AS "nameEn" FROM roles ORDER BY name_ar',
    find: 'SELECT id, name_ar AS "nameAr", name_en AS "nameEn" FROM roles WHERE id = $1',
    direct: 'SELECT permission_key AS key, scope FROM role_permissions WHERE role_id = $1 ORDER BY permission_key',
    clear: 'DELETE FROM role_permissions WHERE role_id = $1',
    insert: 'INSERT INTO role_permissions (role_id, permission_key, scope) VALUES ($1, $2, $3)',
    inherited: null,
  },
  'role-group': {
    list: 'SELECT id, name_ar AS "nameAr", name_en AS "nameEn" FROM role_groups ORDER BY name_ar',
    find: 'SELECT id, name_ar AS "nameAr", name_en AS "nameEn" FROM role_groups WHERE id = $1',
    direct: 'SELECT permission_key AS key, scope FROM role_group_permissions WHERE group_id = $1 ORDER BY permission_key',
    clear: 'DELETE FROM role_group_permissions WHERE group_id = $1',
    insert: 'INSERT INTO role_group_permissions (group_id, permission_key, scope) VALUES ($1, $2, $3)',
    inherited: 'SELECT rp.permission_key AS key, rp.scope FROM role_permissions rp JOIN role_group_roles gr ON gr.role_id = rp.role_id WHERE gr.group_id = $1',
  },
  user: {
    list: null,
    find: 'SELECT u.id, COALESCE(e.full_name, u.name) AS "nameAr", COALESCE(e.full_name, u.name) AS "nameEn" FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = $1',
    direct: 'SELECT permission_key AS key, scope FROM user_permissions WHERE user_id = $1 ORDER BY permission_key',
    clear: 'DELETE FROM user_permissions WHERE user_id = $1',
    insert: 'INSERT INTO user_permissions (user_id, permission_key, scope) VALUES ($1, $2, $3)',
    inherited: `SELECT rp.permission_key AS key, rp.scope FROM role_permissions rp WHERE rp.role_id IN (
        SELECT role_id FROM user_roles WHERE user_id = $1
        UNION SELECT gr.role_id FROM user_role_groups ug JOIN role_group_roles gr ON gr.group_id = ug.group_id WHERE ug.user_id = $1)
      UNION ALL SELECT gp.permission_key, gp.scope FROM role_group_permissions gp JOIN user_role_groups ug ON ug.group_id = gp.group_id WHERE ug.user_id = $1
      UNION ALL SELECT up.permission_key, up.scope FROM user_group_permissions up JOIN user_group_members m ON m.group_id = up.group_id WHERE m.user_id = $1`,
  },
  'user-group': {
    list: 'SELECT id, name_ar AS "nameAr", name_en AS "nameEn" FROM user_groups ORDER BY name_ar',
    find: 'SELECT id, name_ar AS "nameAr", name_en AS "nameEn" FROM user_groups WHERE id = $1',
    direct: 'SELECT permission_key AS key, scope FROM user_group_permissions WHERE group_id = $1 ORDER BY permission_key',
    clear: 'DELETE FROM user_group_permissions WHERE group_id = $1',
    insert: 'INSERT INTO user_group_permissions (group_id, permission_key, scope) VALUES ($1, $2, $3)',
    inherited: null,
  },
} as const satisfies Record<PermissionTargetKind, { list: string | null; find: string; direct: string; clear: string; insert: string; inherited: string | null }>;

const PEOPLE = `SELECT u.id, COALESCE(e.full_name, u.name) AS "nameAr", COALESCE(e.full_name, u.name) AS "nameEn"
  FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
  WHERE u.is_active AND ($1::text IS NULL OR COALESCE(e.full_name, u.name) ILIKE $1 OR u.email ILIKE $1) ORDER BY 2 LIMIT 30`;

interface GrantRow {
  key: string;
  scope: PermissionScope;
}

@Injectable()
export class TypeOrmPermissionTargetRepository extends PermissionTargetRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  list(kind: PermissionTargetKind, search?: string): Promise<TargetRef[]> {
    const sql = KINDS[kind].list;
    return sql ? this.ds.query(sql) : this.ds.query(PEOPLE, [search ? likeContains(search) : null]);
  }

  async find(kind: PermissionTargetKind, id: string): Promise<TargetRef | null> {
    return (await this.ds.query(KINDS[kind].find, [id]))[0] ?? null;
  }

  async direct(kind: PermissionTargetKind, id: string): Promise<PermissionGrant[]> {
    return (await this.ds.query<GrantRow[]>(KINDS[kind].direct, [id])).map((r) => ({ key: r.key, scope: r.scope }));
  }

  async inherited(kind: PermissionTargetKind, id: string): Promise<PermissionGrant[]> {
    const sql = KINDS[kind].inherited;
    return sql ? (await this.ds.query<GrantRow[]>(sql, [id])).map((r) => ({ key: r.key, scope: r.scope })) : [];
  }

  async replace(kind: PermissionTargetKind, id: string, grants: PermissionGrant[], grantedBy: string | null = null): Promise<void> {
    const unique = [...new Map(grants.map((g) => [g.key, g.scope])).entries()];
    if (kind === 'user') return this.replacePersonal(id, unique, grantedBy);
    await this.ds.transaction(async (m) => {
      await m.query(KINDS[kind].clear, [id]);
      for (const [key, scope] of unique) await m.query(KINDS[kind].insert, [id, key, scope]);
    });
  }

  /** A person's own permissions keep their end date and who gave them; only the scope follows the new list. */
  private async replacePersonal(userId: string, grants: [string, PermissionScope][], grantedBy: string | null): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('DELETE FROM user_permissions WHERE user_id = $1 AND NOT (permission_key = ANY($2::text[]))', [userId, grants.map(([key]) => key)]);
      for (const [key, scope] of grants) {
        await m.query('INSERT INTO user_permissions (user_id, permission_key, scope, granted_by) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, permission_key) DO UPDATE SET scope = EXCLUDED.scope', [userId, key, scope, grantedBy]);
      }
    });
  }
}
