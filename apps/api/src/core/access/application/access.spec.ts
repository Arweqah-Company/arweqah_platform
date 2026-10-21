import { describe, expect, it } from 'vitest';
import type { PermissionScope } from '@arweqah-platform/shared';
import { AccessContext, NO_PLACEMENT, type Placement } from '../domain/access-context';
import { AbilityFactory } from './ability.factory';
import { PermissionCatalog } from './permission-catalog';

const placement: Placement = { companyId: 'c1', orgNodeId: 'n1', managerId: null };
const subtree = ['n1', 'n2', 'n3'];

const context = (scope: PermissionScope, p: Placement = placement, nodes: string[] = subtree) =>
  new AccessContext('u1', p, [{ key: 'leaves.approve', scope }], true, nodes);

describe('AccessContext', () => {
  it('keeps the widest scope when several roles grant the same permission', () => {
    const ctx = new AccessContext(
      'u1',
      placement,
      [
        { key: 'employees.view', scope: 'unit' },
        { key: 'employees.view', scope: 'company' },
        { key: 'employees.view', scope: 'subtree' },
      ],
      true,
    );
    expect(ctx.scopeOf('employees.view')).toBe('company');
    expect(ctx.filterFor('employees.view')).toEqual({ scope: 'company', userId: 'u1', companyId: 'c1', orgNodeId: 'n1' });
    expect(ctx.filterFor('roles.manage')).toBeNull();
  });
});

describe('AbilityFactory (scoped record checks)', () => {
  const factory = new AbilityFactory();

  it.each([
    ['unit', { orgNodeId: 'n1' }, true],
    ['unit', { orgNodeId: 'n2' }, false],
    ['subtree', { orgNodeId: 'n1' }, true],
    ['subtree', { orgNodeId: 'n3' }, true],
    ['subtree', { orgNodeId: 'n9' }, false],
    ['company', { companyId: 'c1', orgNodeId: 'n9' }, true],
    ['company', { companyId: 'c2' }, false],
    ['all', { companyId: 'c9' }, true],
    ['own', { ownerId: 'u1', orgNodeId: 'n9' }, true],
    ['own', { ownerId: 'u2', orgNodeId: 'n1' }, false],
  ] as const)('%s scope on %o → %s', (scope, resource, allowed) => {
    expect(factory.can(context(scope), 'leaves.approve', resource)).toBe(allowed);
  });

  it('a unit-based scope without a placement only covers the user\'s own records', () => {
    for (const scope of ['unit', 'subtree', 'company'] as const) {
      const unplaced = context(scope, NO_PLACEMENT, []);
      expect(factory.can(unplaced, 'leaves.approve', { orgNodeId: null, companyId: null })).toBe(false);
      expect(factory.can(unplaced, 'leaves.approve', { ownerId: 'u1' })).toBe(true);
    }
  });

  it('never grants a permission the user does not hold', () => {
    expect(factory.can(context('all'), 'payroll.view', { companyId: 'c1' })).toBe(false);
  });
});

describe('PermissionCatalog', () => {
  it('rejects duplicate keys, unknown permissions and disallowed scopes', () => {
    const catalog = new PermissionCatalog();
    const def = { key: 'org.manage', module: 'org', labelAr: 'أ', labelEn: 'a', scopes: ['company'] as const };
    catalog.register([def]);
    expect(() => catalog.register([def])).toThrow();
    expect(() => catalog.assertValid([{ key: 'x.y', scope: 'company' }])).toThrow(/does not exist/);
    expect(() => catalog.assertValid([{ key: 'org.manage', scope: 'unit' }])).toThrow(/not allowed/);
    expect(() => catalog.assertValid([{ key: 'org.manage', scope: 'company' }])).not.toThrow();
  });
});
