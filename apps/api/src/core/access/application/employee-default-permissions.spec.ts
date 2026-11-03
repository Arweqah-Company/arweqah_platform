import { COLLABORATOR_BASE_PERMISSIONS, CorePermission, EMPLOYEE_DEFAULT_PERMISSIONS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';

const ORG_ADMIN_KEYS: string[] = [CorePermission.OrgUnitCreate, CorePermission.OrgUnitUpdate, CorePermission.OrgUnitMove, CorePermission.OrgUnitDelete, CorePermission.OrgLevelsManage, CorePermission.OrgTitlesManage];

describe('The Employee role does not manage the structure (FR-69)', () => {
  it('holds none of the keys that add, edit, move or delete a unit, edit the levels, or add a job title; neither does the collaborator base', () => {
    for (const list of [EMPLOYEE_DEFAULT_PERMISSIONS, COLLABORATOR_BASE_PERMISSIONS]) {
      expect(list.map((p) => p.key).filter((key) => ORG_ADMIN_KEYS.includes(key))).toEqual([]);
    }
  });
});

describe('The Employee role gives every person the baseline (FR-86)', () => {
  it('holds the structure page and the own-task keys, and the own record only at scope own', () => {
    const keys = EMPLOYEE_DEFAULT_PERMISSIONS.map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining([CorePermission.OrgView, CorePermission.TasksView, CorePermission.TasksCreate, CorePermission.TasksUpdate, CorePermission.TasksCommentAdd]));
    const scope = (key: string) => EMPLOYEE_DEFAULT_PERMISSIONS.find((p) => p.key === key)?.scope;
    expect(scope(CorePermission.EmployeesView)).toBe('own');
    expect(scope(CorePermission.TasksView)).toBe('own');
    expect(keys).not.toContain(CorePermission.TasksTeamView);
  });
});
