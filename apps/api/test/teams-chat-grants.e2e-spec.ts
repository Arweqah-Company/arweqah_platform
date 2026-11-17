import { describe, expect, it } from 'vitest';
import { TeamsChatGrants1794900000000 } from '../src/database/migrations/1794900000000-TeamsChatGrants';
import { useTestApp } from './setup/test-app';

describe('Migration TeamsChatGrants: directory.contact_teams goes to the Employee role and the head roles only where missing (FR-154, standing rule 17)', () => {
  const t = useTestApp();

  it('adds the key to an `everyone` and a `node_head` role, leaves other roles alone, and does not duplicate it', async () => {
    const runner = t.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('CREATE TEMP TABLE roles (id uuid, auto_rule varchar)');
      await runner.query('CREATE TEMP TABLE role_permissions (role_id uuid, permission_key varchar, scope varchar)');
      const [everyone, head, other] = ['00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b3'];
      await runner.query(`INSERT INTO roles VALUES ('${everyone}', 'everyone'), ('${head}', 'node_head'), ('${other}', NULL)`);
      await runner.query(`INSERT INTO role_permissions VALUES ('${head}', 'directory.contact_teams', 'all')`);
      const migration = new TeamsChatGrants1794900000000();
      await migration.up(runner);
      await migration.up(runner); // idempotent
      const rows = (await runner.query('SELECT role_id, permission_key FROM role_permissions ORDER BY role_id')) as { role_id: string; permission_key: string }[];
      const of = (role: string) => rows.filter((r) => r.role_id === role).map((r) => r.permission_key);
      expect(of(everyone)).toEqual(['directory.contact_teams']);
      expect(of(head)).toEqual(['directory.contact_teams']);
      expect(of(other)).toEqual([]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
