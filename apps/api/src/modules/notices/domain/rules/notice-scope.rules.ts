import { isTreeScope } from '@arweqah-platform/shared';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import type { PeopleScope } from '../contracts/notice-channel.repository';

/** The reach of an access filter the way the SQL of the lists takes it: everyone, a company, or the units of a unit-based scope (with the units managed per company). */
export function peopleScopeOf(filter: ScopeFilter): PeopleScope {
  if (filter.scope === 'all') return { kind: 'all' };
  if (filter.scope === 'company') return filter.companyId ? { kind: 'company', companyId: filter.companyId } : { kind: 'none' };
  if (!isTreeScope(filter.scope) || !filter.nodeIds.length) return { kind: 'none' };
  return { kind: 'nodes', ids: filter.nodeIds, restrictedIds: filter.restrictedNodeIds, companyId: filter.companyId };
}
