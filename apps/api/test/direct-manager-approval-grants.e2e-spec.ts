import { describe, expect, it } from 'vitest';
import { DirectManagerApprovalGrants1794900000200 } from '../src/database/migrations/1794900000200-DirectManagerApprovalGrants';
import { useTestApp } from './setup/test-app';

describe('Migration DirectManagerApprovalGrants: tasks.approve and tasks.reject go to the Direct manager role only where missing (FR-51)', () => {
  const t = useTestApp();

  it('adds both keys at subtree to a `has_reports` role, leaves other roles alone, and does not duplicate or change an existing key', async () => {
    const runner = t.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('CREATE TEMP TABLE roles (id uuid, auto_rule varchar)');
      await runner.query('CREATE TEMP TABLE role_permissions (role_id uuid, permission_key varchar, scope varchar)');
      const [manager, other] = ['00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2'];
      await runner.query(`INSERT INTO roles VALUES ('${manager}', 'has_reports'), ('${other}', 'everyone')`);
      await runner.query(`INSERT INTO role_permissions VALUES ('${manager}', 'tasks.approve', 'unit')`);
      const migration = new DirectManagerApprovalGrants1794900000200();
      await migration.up(runner);
      await migration.up(runner); // idempotent
      const rows = (await runner.query('SELECT role_id, permission_key, scope FROM role_permissions ORDER BY permission_key')) as { role_id: string; permission_key: string; scope: string }[];
      expect(rows.filter((r) => r.role_id === other)).toEqual([]);
      expect(rows.filter((r) => r.role_id === manager).map((r) => [r.permission_key, r.scope])).toEqual([['tasks.approve', 'unit'], ['tasks.reject', 'subtree']]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
