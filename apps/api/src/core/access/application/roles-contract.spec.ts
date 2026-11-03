import {
  DERIVED_ROLE_RULES,
  PERMISSION_TARGET_KINDS,
  ROLE_ASSIGNMENTS,
  ROLE_AUTO_RULES,
  assignGroupsSchema,
  assignPermissionsSchema,
  isDerivedRule,
  permissionGrantSchema,
  roleGroupInputSchema,
  upsertRoleSchema,
  userGroupInputSchema,
} from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';

const id = '00000000-0000-4000-8000-000000000001';
const names = { nameAr: 'اسم', nameEn: 'Name' };

/** The shapes the API and the web share (`packages/shared/src/roles/*`), exported from one place. */
describe('Roles contract (FR-05, FR-43, FR-46, FR-47, FR-68, FR-69)', () => {
  it('validates a role: names, a scoped permission list, and nothing else', () => {
    expect(upsertRoleSchema.safeParse({ ...names, permissions: [{ key: 'roles.view', scope: 'all' }] }).success).toBe(true);
    expect(upsertRoleSchema.safeParse({ ...names, assignment: 'auto', description: 'x', permissions: [] }).success).toBe(true);
    expect(upsertRoleSchema.safeParse({ ...names, permissions: [], extra: 1 }).success).toBe(false);
    expect(upsertRoleSchema.safeParse({ ...names, assignment: 'sometimes', permissions: [] }).success).toBe(false);
    expect(permissionGrantSchema.safeParse({ key: 'Roles View', scope: 'all' }).success).toBe(false);
    expect(permissionGrantSchema.safeParse({ key: 'roles.view', scope: 'galaxy' }).success).toBe(false);
  });

  it('knows how roles are assigned and which automatic rules follow the organization', () => {
    expect([...ROLE_ASSIGNMENTS]).toEqual(['auto', 'manual']);
    expect([...ROLE_AUTO_RULES]).toEqual(['everyone', 'has_reports', 'job_title', 'node_head', 'limited_access']);
    expect([...DERIVED_ROLE_RULES]).toEqual(['job_title', 'node_head']);
    expect(isDerivedRule('job_title')).toBe(true);
    expect(isDerivedRule('node_head')).toBe(true);
    expect(isDerivedRule('everyone')).toBe(false);
    expect(isDerivedRule('has_reports')).toBe(false);
    expect(isDerivedRule(null)).toBe(false);
  });

  it('validates groups of roles, groups of people and what is given to one person', () => {
    expect(roleGroupInputSchema.safeParse({ ...names, roleIds: [id] }).success).toBe(true);
    expect(roleGroupInputSchema.safeParse({ ...names, roleIds: ['not-an-id'] }).success).toBe(false);
    expect(userGroupInputSchema.safeParse({ ...names, userIds: [id] }).success).toBe(true);
    expect(userGroupInputSchema.safeParse({ ...names, userIds: [id], extra: true }).success).toBe(false);
    expect(assignGroupsSchema.safeParse({ groupIds: [id] }).success).toBe(true);
    expect(assignGroupsSchema.safeParse({ groupIds: [1] }).success).toBe(false);
    expect(assignPermissionsSchema.safeParse({ permissions: [{ key: 'audit.view', scope: 'own' }] }).success).toBe(true);
    expect(assignPermissionsSchema.safeParse({ permissions: [{ key: 'audit.view' }] }).success).toBe(false);
  });

  it('names what a permission can be placed on', () => {
    expect([...PERMISSION_TARGET_KINDS]).toEqual(['role', 'role-group', 'user', 'user-group']);
  });
});
