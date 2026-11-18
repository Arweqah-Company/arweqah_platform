import type { PermissionTargetDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { grantsExport } from './export-grants';

const target: PermissionTargetDto = {
  kind: 'role', id: 'r1', nameAr: 'مدير الموارد', nameEn: 'HR Manager',
  permissions: [{ key: 'tickets.view', scope: 'subtree' }, { key: 'employees.update', scope: 'all', fields: ['phone', 'email'] }, { key: 'employees.view', scope: 'unit', fields: [] }],
  inherited: [{ key: 'tasks.view', scope: 'all' }],
};

describe('Exporting the permissions of a role for the seeder (FR-161)', () => {
  it('lists its own grants sorted by key, with fields only when there are some, and never what reaches it from elsewhere', () => {
    const { json, filename } = grantsExport(target);
    expect(JSON.parse(json)).toEqual({
      kind: 'role', nameAr: 'مدير الموارد', nameEn: 'HR Manager',
      permissions: [{ key: 'employees.update', scope: 'all', fields: ['email', 'phone'] }, { key: 'employees.view', scope: 'unit' }, { key: 'tickets.view', scope: 'subtree' }],
    });
    expect(filename).toMatch(/^permissions-role-hr-manager-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
