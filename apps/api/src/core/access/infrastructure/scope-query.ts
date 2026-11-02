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
  const params = { scopeOwner: filter.userId, scopeCompany: filter.companyId, scopeNode: filter.orgNodeId, scopeManagedUnits: [...filter.managedUnitIds], scopeManagedSubtree: [...filter.managedSubtreeIds] };
  const wide = widerCondition(filter, columns);
  return qb.andWhere(wide ? `(${wide} OR ${own})` : own, params);
}

function widerCondition(filter: ScopeFilter, columns: ScopeColumns): string | null {
  switch (filter.scope) {
    case 'company':
      return filter.companyId && columns.company ? `${columns.company} = :scopeCompany` : null;
    case 'subtree':
      return columns.orgNode ? nodeCondition(columns.orgNode, !!filter.orgNodeId, filter.managedSubtreeIds.length > 0, 'SUBTREE') : null;
    case 'unit':
      return columns.orgNode ? nodeCondition(columns.orgNode, !!filter.orgNodeId, filter.managedUnitIds.length > 0, 'UNIT') : null;
    default:
      return null;
  }
}

/** Where the person sits (a unit, or a unit and below) and the units they manage; null when they have neither. */
function nodeCondition(column: string, sits: boolean, manages: boolean, kind: 'UNIT' | 'SUBTREE'): string | null {
  const here = kind === 'UNIT' ? `${column} = :scopeNode` : `${column} IN (SELECT descendant_id FROM org_node_closure WHERE ancestor_id = :scopeNode)`;
  const managed = `${column} = ANY(:${kind === 'UNIT' ? 'scopeManagedUnits' : 'scopeManagedSubtree'})`;
  const parts = [...(sits ? [here] : []), ...(manages ? [managed] : [])];
  return parts.length ? parts.join(' OR ') : null;
}
