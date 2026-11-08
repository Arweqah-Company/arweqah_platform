import { describe, expect, it } from 'vitest';
import { CareerOwnPathGrants1794158703374 } from '../src/database/migrations/1794158703374-CareerOwnPathGrants';
import { useTestApp } from './setup/test-app';

describe('Migration CareerOwnPathGrants: the own-path keys go to the Employee role and the head roles only where missing (FR-112, standing rule 17)', () => {
  const t = useTestApp();

  it('adds the three keys to an `everyone` role and a `node_head` role, leaves other roles alone, and does not duplicate a key a role has', async () => {
    const runner = t.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('CREATE TEMP TABLE roles (id uuid, auto_rule varchar)');
      await runner.query('CREATE TEMP TABLE role_permissions (role_id uuid, permission_key varchar, scope varchar)');
      const [everyone, head, other] = ['00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a3'];
      await runner.query(`INSERT INTO roles VALUES ('${everyone}', 'everyone'), ('${head}', 'node_head'), ('${other}', NULL)`);
      await runner.query(`INSERT INTO role_permissions VALUES ('${head}', 'career_profile.view', 'all')`);
      await new CareerOwnPathGrants1794158703374().up(runner);
      const rows = (await runner.query('SELECT role_id, permission_key FROM role_permissions ORDER BY role_id, permission_key')) as { role_id: string; permission_key: string }[];
      const of = (role: string) => rows.filter((r) => r.role_id === role).map((r) => r.permission_key);
      expect(of(everyone)).toEqual(['career_acknowledge.create', 'career_learning.export', 'career_profile.view']);
      expect(of(head)).toEqual(['career_acknowledge.create', 'career_learning.export', 'career_profile.view']);
      expect(of(other)).toEqual([]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
