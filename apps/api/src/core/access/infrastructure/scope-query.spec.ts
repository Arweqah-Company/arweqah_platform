import type { SelectQueryBuilder } from 'typeorm';
import { describe, expect, it } from 'vitest';
import type { ScopeFilter } from '../domain/access-context';
import { applyScope } from './scope-query';

const COLUMNS = { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' };
const filter = (scope: ScopeFilter['scope'], nodeIds: string[] = []): ScopeFilter => ({ scope, userId: 'u1', companyId: 'c1', nodeIds });

/** Runs applyScope on a recorder that keeps the condition and the parameters it was given. */
function run(f: ScopeFilter): { where: string | null; params: Record<string, unknown> | null } {
  const seen: { where: string | null; params: Record<string, unknown> | null } = { where: null, params: null };
  const qb = { andWhere: (where: string, params: Record<string, unknown>) => { Object.assign(seen, { where, params }); return qb; } } as unknown as SelectQueryBuilder<never>;
  applyScope(qb, f, COLUMNS);
  return seen;
}

describe('applyScope (FR-06, FR-80)', () => {
  it('adds nothing for the all scope', () => {
    expect(run(filter('all')).where).toBeNull();
  });

  it('limits to the company, and always keeps the person\'s own rows', () => {
    expect(run(filter('company')).where).toBe('(e.company_id = :scopeCompany OR e.user_id = :scopeOwner)');
  });

  it.each(['unit', 'subtree', 'subtree:1', 'subtree:3'] as const)('limits a %s scope to the units it reaches', (scope) => {
    const seen = run(filter(scope, ['n1', 'n2']));
    expect(seen.where).toBe('(e.org_node_id = ANY(:scopeNodes) OR e.user_id = :scopeOwner)');
    expect(seen.params).toMatchObject({ scopeNodes: ['n1', 'n2'], scopeOwner: 'u1' });
  });

  it('falls back to the person\'s own rows when a unit-based scope reaches no unit', () => {
    expect(run(filter('subtree:1', [])).where).toBe('e.user_id = :scopeOwner');
    expect(run(filter('own')).where).toBe('e.user_id = :scopeOwner');
  });
});
