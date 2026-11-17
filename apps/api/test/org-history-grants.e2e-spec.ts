import { describe, expect, it } from 'vitest';
import { OrgHistoryViewGrants1794900000100 } from '../src/database/migrations/1794900000100-OrgHistoryViewGrants';
import { useTestApp } from './setup/test-app';

describe('Migration OrgHistoryViewGrants: org.history_view goes to who sees or edits the whole structure and to the head roles, not to the Employee role (FR-99, standing rule 17)', () => {
  const t = useTestApp();

  it('keeps what people had, adds the key once, and leaves the Employee role and other roles without it', async () => {
    const runner = t.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('CREATE TEMP TABLE roles (id uuid, auto_rule varchar)');
      await runner.query('CREATE TEMP TABLE role_permissions (role_id uuid, permission_key varchar, scope varchar)');
      const [everyone, head, full, editor, other] = [1, 2, 3, 4, 5].map((n) => `00000000-0000-4000-8000-0000000000c${n}`);
      await runner.query(`INSERT INTO roles VALUES ('${everyone}', 'everyone'), ('${head}', 'node_head'), ('${full}', NULL), ('${editor}', NULL), ('${other}', NULL)`);
      await runner.query(`INSERT INTO role_permissions VALUES ('${everyone}', 'org.view', 'all'), ('${full}', 'org.view_full', 'all'), ('${editor}', 'org.unit_update', 'company'), ('${other}', 'org.view', 'all')`);
      const migration = new OrgHistoryViewGrants1794900000100();
      await migration.up(runner);
      await migration.up(runner); // idempotent
      const rows = (await runner.query("SELECT role_id, scope FROM role_permissions WHERE permission_key = 'org.history_view' ORDER BY role_id")) as { role_id: string; scope: string }[];
      expect(rows).toEqual([{ role_id: head, scope: 'subtree' }, { role_id: full, scope: 'all' }, { role_id: editor, scope: 'all' }]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
