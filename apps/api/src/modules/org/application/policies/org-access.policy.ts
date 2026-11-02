import { CorePermission, isTreeScope } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';

/**
 * Org permissions reach "company" (the user's own company) or "all"; viewing the structure also reaches "the unit and so many
 * levels below" (the company is then the user's own and `visibleNodes` narrows the units). A company outside the user's
 * reach does not exist for them (404), as for every scoped record.
 */
export function assertCompanyAccess(ctx: AccessContext, key: string, companyId: string): void {
  const scope = ctx.scopeOf(key);
  if (scope === 'all') return;
  if ((scope === 'company' || (scope && isTreeScope(scope))) && ctx.placement.companyId === companyId) return;
  throw new NotFoundError('Company', companyId);
}

export const ORG_VIEW = CorePermission.OrgView;
export const ORG_UNIT_CREATE = CorePermission.OrgUnitCreate;
export const ORG_UNIT_UPDATE = CorePermission.OrgUnitUpdate;
export const ORG_UNIT_MOVE = CorePermission.OrgUnitMove;
export const ORG_UNIT_DELETE = CorePermission.OrgUnitDelete;
export const ORG_LEVELS = CorePermission.OrgLevelsManage;
export const ORG_TITLES = CorePermission.OrgTitlesManage;

/**
 * The units of a company the permission lets the person see. With the company or all scope that is every unit; with a unit-based scope it is the
 * units the scope reaches, and the highest of them is shown as a root (its parent is not theirs to see).
 */
export function visibleNodes<T extends { id: string; parentId: string | null }>(ctx: AccessContext, key: string, nodes: T[]): T[] {
  const scope = ctx.scopeOf(key);
  if (!scope || !isTreeScope(scope)) return nodes;
  const reached = new Set(ctx.nodesFor(scope));
  return nodes.filter((n) => reached.has(n.id)).map((n) => (n.parentId && reached.has(n.parentId) ? n : { ...n, parentId: null }));
}
