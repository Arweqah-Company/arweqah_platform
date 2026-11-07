import { describe, expect, it } from 'vitest';
import { HeadRolesOwnAccountTicketsTasks1793780000000 } from '../src/database/migrations/1793780000000-HeadRolesOwnAccountTicketsTasks';
import { useTestApp } from './setup/test-app';

describe('Migration HeadRolesOwnAccountTicketsTasks: adds only the new keys and keeps what an administrator removed (FR-69)', () => {
  const t = useTestApp();

  it('does not give back a default key (tasks.approve) taken off a head role, and adds the new ones', async () => {
    const runner = t.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('CREATE TEMP TABLE roles (id uuid, auto_rule varchar)');
      await runner.query('CREATE TEMP TABLE role_permissions (role_id uuid, permission_key varchar, scope varchar)');
      const role = '00000000-0000-4000-8000-0000000000aa';
      await runner.query(`INSERT INTO roles VALUES ('${role}', 'node_head')`);
      await runner.query(`INSERT INTO role_permissions VALUES ('${role}', 'tasks.team_view', 'subtree')`);
      await new HeadRolesOwnAccountTicketsTasks1793780000000().up(runner);
      const keys = ((await runner.query('SELECT permission_key FROM role_permissions')) as { permission_key: string }[]).map((r) => r.permission_key);
      expect(keys).toContain('tickets.view');
      expect(keys).toContain('profile.update');
      for (const old of ['tasks.approve', 'tasks.reject', 'tasks.matrix_view', 'employees.view', 'employees.history_view', 'tickets.figures_view']) expect(keys).not.toContain(old);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
