import { describe, expect, it } from 'vitest';
import { MANAGER_SOURCE_BACKFILL } from '../src/database/migrations/1793770000000-OrgVersionsLeadersTitles';
import { useTestApp } from './setup/test-app';

describe('Migration OrgVersionsLeadersTitles: the source of the manager periods that already exist (CodeRabbit, PR 52)', () => {
  const t = useTestApp();

  it('marks a period that names a manager `manual` (a person chose it) and a period with no manager `auto_chain` (nobody chose anything, so the chain may fill it)', async () => {
    const chosen = await t.factories.user();
    const manager = await t.factories.user();
    const none = await t.factories.user();
    const q = t.db.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    try {
      // Put the table back in the state it had before the migration ran (inside a transaction that is rolled back).
      await q.query('ALTER TABLE employee_assignments DROP CONSTRAINT "CHK_employee_assignments_manager_source"');
      await q.query(`UPDATE employee_assignments SET manager_source = NULL WHERE field = 'manager'`);
      // The two periods the earlier migration wrote for existing employees: one with the manager the record held, one with none.
      const insert = `INSERT INTO employee_assignments (employee_id, field, manager_employee_id, valid_from, reason, applied_at) VALUES ($1, 'manager', $2, '2024-01-01', 'Placement at the start of history', now())`;
      await q.query(insert, [chosen.employeeId, manager.employeeId]);
      await q.query(insert, [none.employeeId, null]);
      await q.query(MANAGER_SOURCE_BACKFILL);
      const rows: { employeeId: string; source: string }[] = await q.query(
        `SELECT employee_id AS "employeeId", manager_source AS source FROM employee_assignments WHERE field = 'manager' AND employee_id = ANY($1)`,
        [[chosen.employeeId, none.employeeId]],
      );
      const sourceOf = (id: string) => rows.find((r) => r.employeeId === id)?.source;
      expect(sourceOf(chosen.employeeId)).toBe('manual');
      expect(sourceOf(none.employeeId)).toBe('auto_chain');
    } finally {
      await q.rollbackTransaction();
      await q.release();
    }
  });
});
