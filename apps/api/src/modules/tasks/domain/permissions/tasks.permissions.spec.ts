import { CorePermission, EMPLOYEE_DEFAULT_PERMISSIONS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { TASK_PERMISSIONS } from './tasks.permissions';

const TASK_KEYS = Object.values(CorePermission).filter((key) => key.startsWith('tasks.'));

describe('Task permissions (FR-48, FR-54)', () => {
  it('declares every tasks key with both labels and the module', () => {
    expect(TASK_PERMISSIONS.map((p) => p.key).sort()).toEqual([...TASK_KEYS].sort());
    for (const p of TASK_PERMISSIONS) {
      expect(p.module).toBe('tasks');
      expect(p.labelAr.length).toBeGreaterThan(0);
      expect(p.labelEn.length).toBeGreaterThan(0);
      expect(p.scopes.length).toBeGreaterThan(0);
    }
  });

  it('gives none of them to the Employee role, so the feature stays hidden', () => {
    const given = EMPLOYEE_DEFAULT_PERMISSIONS.map((p) => p.key as string);
    expect(TASK_KEYS.filter((key) => given.includes(key))).toEqual([]);
  });
});
