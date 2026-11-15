import { describe, expect, it } from 'vitest';
import { SyncClearedPhones1794318000000 } from '../src/database/migrations/1794318000000-SyncClearedPhones';
import { useTestApp } from './setup/test-app';

describe('Migration SyncClearedPhones: an account whose employee has no phone has none either (review of PR 91)', () => {
  const t = useTestApp();

  it('empties the stale phone of an account and keeps the phone of an employee who has one', async () => {
    const without = await t.factories.user({});
    const withPhone = await t.factories.user({});
    await t.db.query(`UPDATE employees SET personal_phone = NULL WHERE id = $1`, [without.employeeId]);
    await t.db.query(`UPDATE employees SET personal_phone = '+966501111111' WHERE id = $1`, [withPhone.employeeId]);
    await t.db.query(`UPDATE users SET phone = '+966500000000' WHERE id = ANY($1)`, [[without.id, withPhone.id]]);
    const runner = t.db.createQueryRunner();
    await runner.connect();
    try {
      await new SyncClearedPhones1794318000000().up(runner);
    } finally {
      await runner.release();
    }
    const phoneOf = async (id: string) => ((await t.db.query('SELECT phone FROM users WHERE id = $1', [id])) as { phone: string | null }[])[0]?.phone;
    expect(await phoneOf(without.id)).toBeNull();
    expect(await phoneOf(withPhone.id)).toBe('+966500000000'); // the other direction is the old migration's job
  });
});
