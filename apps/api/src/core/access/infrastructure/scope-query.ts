import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
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
  const params = { scopeOwner: filter.userId, scopeCompany: filter.companyId, scopeNode: filter.orgNodeId };
  const wide = widerCondition(filter, columns);
  return qb.andWhere(wide ? `(${wide} OR ${own})` : own, params);
}

function widerCondition(filter: ScopeFilter, columns: ScopeColumns): string | null {
  switch (filter.scope) {
    case 'company':
      return filter.companyId && columns.company ? `${columns.company} = :scopeCompany` : null;
    case 'subtree':
      return filter.orgNodeId && columns.orgNode
        ? `${columns.orgNode} IN (SELECT descendant_id FROM org_node_closure WHERE ancestor_id = :scopeNode)`
        : null;
    case 'unit':
      return filter.orgNodeId && columns.orgNode ? `${columns.orgNode} = :scopeNode` : null;
    default:
      return null;
  }
}
