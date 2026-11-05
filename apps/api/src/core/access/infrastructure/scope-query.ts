import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { isTreeScope } from '@arweqah-platform/shared';
import type { ScopeFilter } from '../domain/access-context';

/** Qualified column names that place a row in the organization. */
export interface ScopeColumns {
  owner: string;
  company?: string;
  orgNode?: string;
}

/**
 * Applies a ScopeFilter to a list query (Specification pattern), so every module
 * restricts lists the same way. Wider scopes always include the user's own rows;
 * a missing placement narrows the result to own rows only.
 */
export function applyScope<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  filter: ScopeFilter,
  columns: ScopeColumns,
): SelectQueryBuilder<T> {
  if (filter.scope === 'all') return qb;
  const own = `${columns.owner} = :scopeOwner`;
  const params = { scopeOwner: filter.userId, scopeCompany: filter.companyId, scopeNodes: [...filter.nodeIds], scopeRestricted: [...filter.restrictedNodeIds] };
  const wide = widerCondition(filter, columns);
  return qb.andWhere(wide ? `(${wide} OR ${own})` : own, params);
}

/**
 * A company scope is the company; a unit-based scope (the unit, or the unit and so many levels below) is the units in `nodeIds`,
 * and in a unit managed per company only the people of the viewer's company (without a company column, such a unit is left out).
 */
function widerCondition(filter: ScopeFilter, columns: ScopeColumns): string | null {
  if (filter.scope === 'company') return filter.companyId && columns.company ? `${columns.company} = :scopeCompany` : null;
  if (!isTreeScope(filter.scope) || !columns.orgNode || !filter.nodeIds.length) return null;
  const inUnits = `${columns.orgNode} = ANY(:scopeNodes)`;
  if (!filter.restrictedNodeIds.length) return inUnits;
  const sameCompany = columns.company && filter.companyId ? ` OR ${columns.company} = :scopeCompany` : '';
  return `(${inUnits} AND (${columns.orgNode} <> ALL(:scopeRestricted)${sameCompany}))`;
}
