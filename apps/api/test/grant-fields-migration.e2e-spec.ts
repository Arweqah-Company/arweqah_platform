import { describe, expect, it } from 'vitest';
import { GrantFields1793750000000 } from '../src/database/migrations/1793750000000-GrantFields';
import { useTestApp } from './setup/test-app';

const HOLDER = { role_permissions: 'role_id', role_group_permissions: 'group_id', user_group_permissions: 'group_id', user_permissions: 'user_id' } as const;
const STRUCTURE = ['companyId', 'orgNodeId', 'jobTitleId', 'managerId', 'relationTypeId', 'startDate', 'endDate', 'terminationReasonId', 'terminationReasonOther', 'employeeNumber'];
const a = '00000000-0000-4000-8000-00000000000a';
const b = '00000000-0000-4000-8000-00000000000b';
const c = '00000000-0000-4000-8000-00000000000c';

describe('Migration GrantFields: what the old rules gave is kept on each grant (FR-94)', () => {
  const t = useTestApp();

  it('gives a plain grant the old HR fields plus the structure, an own-record grant the self fields, and the holders of «employee_fields.edit» every field', async () => {
    const runner = t.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      // Stand-ins (temporary tables shadow the real ones inside this transaction) holding the state before the migration.
      await runner.query('CREATE TEMP TABLE employee_field_rules (field varchar PRIMARY KEY, editable_by_self boolean, editable_by_hr boolean)');
      await runner.query("INSERT INTO employee_field_rules VALUES ('workPhone', true, true), ('iban', false, false)");
      await runner.query('CREATE TEMP TABLE page_visibility_rules (page_key varchar)');
      for (const [table, holder] of Object.entries(HOLDER)) await runner.query(`CREATE TEMP TABLE ${table} (${holder} uuid, permission_key varchar, scope varchar)`);
      await runner.query(`INSERT INTO role_permissions (role_id, permission_key, scope) VALUES
        ('${a}', 'employees.update', 'all'), ('${a}', 'employee_fields.edit', 'all'),
        ('${b}', 'employees.update', 'all'), ('${c}', 'employees.update', 'own'), ('${c}', 'employee_fields.edit', 'all')`);
      await new GrantFields1793750000000().up(runner);
      const rows = (await runner.query("SELECT role_id AS id, fields, permission_key FROM role_permissions ORDER BY role_id")) as { id: string; fields: string[] | null; permission_key: string }[];
      const fieldsOf = (id: string) => rows.find((r) => r.id === id && r.permission_key === 'employees.update')?.fields?.slice().sort();
      expect(fieldsOf(a)).toEqual(['iban', 'workPhone', ...STRUCTURE].sort());
      expect(fieldsOf(b)).toEqual(['workPhone', ...STRUCTURE].sort());
      expect(fieldsOf(c)).toEqual(['workPhone']);
      expect(rows.some((r) => r.permission_key.startsWith('employee_fields.'))).toBe(false);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
