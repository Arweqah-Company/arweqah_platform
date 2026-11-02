import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ExceptionKind, ExceptionRef } from '@arweqah-platform/shared';
import { returnedRows } from '../../../common/infrastructure/query-result';
import { AccessExceptionRepository, type AccessExceptionRow } from '../domain/access-exception.repository';

/** Where each kind of exception lives: its table, the column that names the target, and what a row of the list is made of. */
const TABLES: Record<ExceptionKind, { table: string; target: string }> = {
  role: { table: 'user_roles', target: 'role_id' },
  permission: { table: 'user_permissions', target: 'permission_key' },
  'role-group': { table: 'user_role_groups', target: 'group_id' },
};

const TODAY = `(now() AT TIME ZONE 'Asia/Riyadh')::date`;
const COMMON = (alias: string) => `${alias}.user_id AS "userId", COALESCE(e.full_name, u.name) AS "userName", ${alias}.granted_by AS "grantedById", g.name AS "grantedByName",
  to_char(${alias}.granted_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD"T"HH24:MI:SS') AS "grantedAt", to_char(${alias}.expires_at, 'YYYY-MM-DD') AS "expiresAt"`;
const PEOPLE = (alias: string) => `JOIN users u ON u.id = ${alias}.user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL LEFT JOIN users g ON g.id = ${alias}.granted_by`;
const HOLDS = (alias: string) => `(${alias}.expires_at IS NULL OR ${alias}.expires_at >= ${TODAY})`;

const LIST = `
  SELECT 'role' AS kind, ${COMMON('x')}, r.id::text AS "targetId", r.name_ar AS "targetNameAr", r.name_en AS "targetNameEn", NULL AS scope
    FROM user_roles x JOIN roles r ON r.id = x.role_id ${PEOPLE('x')} WHERE r.auto_rule IS NULL AND ${HOLDS('x')}
  UNION ALL
  SELECT 'permission', ${COMMON('x')}, x.permission_key, NULL, NULL, x.scope FROM user_permissions x ${PEOPLE('x')} WHERE ${HOLDS('x')}
  UNION ALL
  SELECT 'role-group', ${COMMON('x')}, rg.id::text, rg.name_ar, rg.name_en, NULL FROM user_role_groups x JOIN role_groups rg ON rg.id = x.group_id ${PEOPLE('x')} WHERE ${HOLDS('x')}
  ORDER BY "grantedAt" DESC LIMIT 2000`;

@Injectable()
export class TypeOrmAccessExceptionRepository extends AccessExceptionRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  list(): Promise<AccessExceptionRow[]> {
    return this.ds.query(LIST);
  }

  async remove(ref: ExceptionRef): Promise<boolean> {
    const { table, target } = TABLES[ref.kind];
    return returnedRows(await this.ds.query(`DELETE FROM ${table} WHERE user_id = $1 AND ${target}::text = $2 RETURNING user_id`, [ref.userId, ref.targetId])).length > 0;
  }

  async setExpiry(ref: ExceptionRef, expiresAt: string | null): Promise<boolean> {
    const { table, target } = TABLES[ref.kind];
    return returnedRows(await this.ds.query(`UPDATE ${table} SET expires_at = $3 WHERE user_id = $1 AND ${target}::text = $2 RETURNING user_id`, [ref.userId, ref.targetId, expiresAt])).length > 0;
  }

  async removeEnded(today: string): Promise<ExceptionRef[]> {
    const removed: ExceptionRef[] = [];
    for (const [kind, { table, target }] of Object.entries(TABLES) as [ExceptionKind, { table: string; target: string }][]) {
      const rows = returnedRows<{ userId: string; targetId: string }>(await this.ds.query(`DELETE FROM ${table} WHERE expires_at < $1 RETURNING user_id AS "userId", ${target}::text AS "targetId"`, [today]));
      for (const row of rows) removed.push({ kind, userId: row.userId, targetId: row.targetId });
    }
    return removed;
  }
}
