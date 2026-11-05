import { describe, expect, it } from 'vitest';
import type { PermissionScope } from '@arweqah-platform/shared';
import { AccessContext, NO_PLACEMENT, reachFrom, type Placement } from '../domain/access-context';
import { AbilityFactory } from './ability.factory';
import { PermissionCatalog } from './permission-catalog';

const placement: Placement = { companyId: 'c1', orgNodeId: 'n1', managerId: null };
/** Where the person sits: n1, with n2 below it, n3 below that, n4 below that. */
const SITS = [{ nodeId: 'n1', depth: 0 }, { nodeId: 'n2', depth: 1 }, { nodeId: 'n3', depth: 2 }, { nodeId: 'n4', depth: 3 }];
/** A unit they manage: m1, with m2 below it and m3 below that. */
const MANAGES = [{ nodeId: 'm1', depth: 0 }, { nodeId: 'm2', depth: 1 }, { nodeId: 'm3', depth: 2 }];

const context = (scope: PermissionScope, p: Placement = placement, rows = SITS) =>
  new AccessContext('u1', p, [{ key: 'leaves.approve', scope }], true, reachFrom(rows));

describe('AccessContext', () => {
  it('keeps the widest scope when several roles grant the same permission', () => {
    const ctx = new AccessContext('u1', placement, [
      { key: 'employees.view', scope: 'unit' },
      { key: 'employees.view', scope: 'company' },
      { key: 'employees.view', scope: 'subtree' },
    ], true);
    expect(ctx.scopeOf('employees.view')).toBe('company');
    expect(ctx.filterFor('employees.view')).toEqual({ scope: 'company', userId: 'u1', companyId: 'c1', nodeIds: [], restrictedNodeIds: [] });
    expect(ctx.filterFor('roles.manage')).toBeNull();
  });

  it('takes the widest depth when roles grant the same permission at different depths', () => {
    const ctx = new AccessContext('u1', placement, [
      { key: 'org.view', scope: 'subtree:1' },
      { key: 'org.view', scope: 'subtree:3' },
      { key: 'org.view', scope: 'unit' },
    ], true, reachFrom(SITS));
    expect(ctx.scopeOf('org.view')).toBe('subtree:3');
  });
});

describe('AccessContext: grants of an administrative role (FR-84)', () => {
  const ctx = new AccessContext('u1', placement, [{ key: 'employees.view', scope: 'own' }], true, reachFrom(SITS), [
    { key: 'employees.view', scope: 'all' },
    { key: 'employees.create', scope: 'all' },
  ]);

  it('leaves them out until the mode is on, then adds them to the ordinary grants', () => {
    expect(ctx.hasElevatedGrants).toBe(true);
    expect(ctx.scopeOf('employees.view')).toBe('own');
    expect(ctx.has('employees.create')).toBe(false);
    const on = ctx.elevate();
    expect(on.scopeOf('employees.view')).toBe('all');
    expect(on.has('employees.create')).toBe(true);
  });
});

describe('AccessContext: how far a unit-based scope reaches (FR-80)', () => {
  const reach = (scope: PermissionScope, rows = [...SITS, ...MANAGES]) => [...context(scope, placement, rows).nodesFor(scope)].sort();

  it('reaches the unit, then so many levels below it, then everything below it', () => {
    expect(reach('unit')).toEqual(['m1', 'n1']);
    expect(reach('subtree:1')).toEqual(['m1', 'm2', 'n1', 'n2']);
    expect(reach('subtree:2')).toEqual(['m1', 'm2', 'm3', 'n1', 'n2', 'n3']);
    expect(reach('subtree')).toEqual(['m1', 'm2', 'm3', 'n1', 'n2', 'n3', 'n4']);
  });

  it('counts the levels from each starting unit and keeps the smallest depth of a unit reached twice', () => {
    expect(reach('subtree:1', [{ nodeId: 'a', depth: 0 }, { nodeId: 'b', depth: 1 }, { nodeId: 'b', depth: 0 }, { nodeId: 'c', depth: 1 }])).toEqual(['a', 'b', 'c']);
  });

  it('reaches nothing for the scopes that are not about units, and for a person with no unit', () => {
    expect(context('company').nodesFor('company')).toEqual([]);
    expect(context('own').nodesFor('own')).toEqual([]);
    expect(context('subtree:1', NO_PLACEMENT, []).nodeScopeOf('leaves.approve')).toEqual({ kind: 'none' });
  });

  it('describes a depth scope as the units it reaches, and leaves company and all as they are', () => {
    expect(context('subtree:1').nodeScopeOf('leaves.approve')).toEqual({ kind: 'nodes', ids: ['n1', 'n2'], restrictedIds: [], companyId: 'c1' });
    expect(context('company').nodeScopeOf('leaves.approve')).toEqual({ kind: 'company', companyId: 'c1' });
    expect(context('all').nodeScopeOf('leaves.approve')).toEqual({ kind: 'all' });
    expect(context('subtree:2').reaches('leaves.approve', { orgNodeId: 'n3', companyId: 'c1' })).toBe(true);
    expect(context('subtree:2').reaches('leaves.approve', { orgNodeId: 'n4', companyId: 'c1' })).toBe(false);
  });

  it('passes the units a scope reaches to list queries', () => {
    expect(context('subtree:1', placement, [...SITS, ...MANAGES]).filterFor('leaves.approve')).toMatchObject({ scope: 'subtree:1', nodeIds: expect.arrayContaining(['n1', 'n2', 'm1', 'm2']) });
  });
});

/** n2 is managed per company, every other unit is shared (FR-100). */
const withRestricted = (scope: PermissionScope) =>
  new AccessContext('u1', placement, [{ key: 'leaves.approve', scope }], true, reachFrom(SITS), [], new Set(['n2']));

describe('Units managed per company (FR-100)', () => {
  const factory = new AbilityFactory();

  it('names the reached units that are managed per company, and passes them to list queries', () => {
    expect(withRestricted('subtree').restrictedNodesFor('subtree')).toEqual(['n2']);
    expect(withRestricted('subtree:0').restrictedNodesFor('subtree:0')).toEqual([]);
    expect(withRestricted('subtree').filterFor('leaves.approve')).toMatchObject({ nodeIds: ['n1', 'n2', 'n3', 'n4'], restrictedNodeIds: ['n2'] });
  });

  it.each([
    [{ orgNodeId: 'n2', companyId: 'c1' }, true],
    [{ orgNodeId: 'n2', companyId: 'c2' }, false],
    [{ orgNodeId: 'n2' }, false],
    [{ orgNodeId: 'n3', companyId: 'c2' }, true],
    [{ orgNodeId: 'n9', companyId: 'c1' }, false],
  ])('a subtree scope on %o → %s (a record of another company is out of reach in a per-company unit only)', (resource, allowed) => {
    expect(withRestricted('subtree').reaches('leaves.approve', resource as { orgNodeId: string; companyId: string })).toBe(allowed);
    expect(factory.can(withRestricted('subtree'), 'leaves.approve', resource)).toBe(allowed);
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
    ['subtree:1', { orgNodeId: 'n2' }, true],
    ['subtree:1', { orgNodeId: 'n3' }, false],
    ['subtree:3', { orgNodeId: 'n4' }, true],
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

  it('accepts a depth scope for a permission that allows subtree, and no other', () => {
    const catalog = new PermissionCatalog();
    const base = { module: 'org', labelAr: 'أ', labelEn: 'a' };
    catalog.register([{ ...base, key: 'org.view', scopes: ['unit', 'subtree', 'company'] }, { ...base, key: 'org.edit', scopes: ['unit', 'company'] }]);
    expect(() => catalog.assertValid([{ key: 'org.view', scope: 'subtree:2' }])).not.toThrow();
    expect(() => catalog.assertValid([{ key: 'org.edit', scope: 'subtree:2' }])).toThrow(/not allowed/);
  });
});
