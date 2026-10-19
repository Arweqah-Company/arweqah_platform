import { describe, expect, it } from 'vitest';
import { AccessContext, type Placement } from '../domain/access-context';
import { AbilityFactory } from './ability.factory';
import { PermissionCatalog } from './permission-catalog';

const placement: Placement = { branchId: 'b1', departmentId: 'd1', teamId: 't1', managerId: null };

describe('AccessContext', () => {
  it('keeps the widest scope when several roles grant the same permission', () => {
    const ctx = new AccessContext('u1', placement, [
      { key: 'users.view', scope: 'team' },
      { key: 'users.view', scope: 'branch' },
      { key: 'users.view', scope: 'department' },
    ], true, false);
    expect(ctx.scopeOf('users.view')).toBe('branch');
    expect(ctx.filterFor('users.view')).toEqual({ scope: 'branch', userId: 'u1', unitId: 'b1' });
    expect(ctx.filterFor('roles.manage')).toBeNull();
  });
});

describe('AbilityFactory (scoped record checks)', () => {
  const factory = new AbilityFactory();
  const ctx = (scope: 'own' | 'team' | 'department' | 'branch' | 'company', p = placement) =>
    new AccessContext('u1', p, [{ key: 'leaves.approve', scope }], true, false);

  it.each([
    ['team', { teamId: 't1' }, true],
    ['team', { teamId: 't2', departmentId: 'd1' }, false],
    ['department', { departmentId: 'd1' }, true],
    ['department', { departmentId: 'd2', branchId: 'b1' }, false],
    ['branch', { branchId: 'b1' }, true],
    ['branch', { branchId: 'b2' }, false],
    ['company', { branchId: 'b9' }, true],
    ['own', { ownerId: 'u1', departmentId: 'd2' }, true],
    ['own', { ownerId: 'u2', departmentId: 'd1' }, false],
  ] as const)('%s scope on %o → %s', (scope, resource, allowed) => {
    expect(factory.can(ctx(scope), 'leaves.approve', resource)).toBe(allowed);
  });

  it('a unit scope without a placement only covers the user\'s own records', () => {
    const noPlacement = ctx('department', { branchId: null, departmentId: null, teamId: null, managerId: null });
    expect(factory.can(noPlacement, 'leaves.approve', { departmentId: null })).toBe(false);
    expect(factory.can(noPlacement, 'leaves.approve', { ownerId: 'u1' })).toBe(true);
  });

  it('never grants a permission the user does not hold', () => {
    expect(factory.can(ctx('company'), 'payroll.view', { branchId: 'b1' })).toBe(false);
  });
});

describe('PermissionCatalog', () => {
  it('rejects duplicate keys, unknown permissions and disallowed scopes', () => {
    const catalog = new PermissionCatalog();
    const def = { key: 'org.manage', module: 'org', labelAr: 'أ', labelEn: 'a', scopes: ['company'] as const };
    catalog.register([def]);
    expect(() => catalog.register([def])).toThrow();
    expect(() => catalog.assertValid([{ key: 'x.y', scope: 'company' }])).toThrow(/does not exist/);
    expect(() => catalog.assertValid([{ key: 'org.manage', scope: 'team' }])).toThrow(/not allowed/);
    expect(() => catalog.assertValid([{ key: 'org.manage', scope: 'company' }])).not.toThrow();
  });
});
