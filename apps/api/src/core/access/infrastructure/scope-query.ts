import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import type { ScopeFilter } from '../domain/access-context';

/** Qualified column names that place a row in the organization. */
export interface ScopeColumns {
  owner: string;
  team?: string;
  department?: string;
  branch?: string;
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
  if (filter.scope === 'company') return qb;
  const unitColumn = filter.scope === 'own' ? undefined : columns[filter.scope as 'team' | 'department' | 'branch'];
  if (!unitColumn || !filter.unitId) {
    return qb.andWhere(`${columns.owner} = :scopeOwner`, { scopeOwner: filter.userId });
  }
  return qb.andWhere(`(${unitColumn} = :scopeUnit OR ${columns.owner} = :scopeOwner)`, {
    scopeUnit: filter.unitId,
    scopeOwner: filter.userId,
  });
}
