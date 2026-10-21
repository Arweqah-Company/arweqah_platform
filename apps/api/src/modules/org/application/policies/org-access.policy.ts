import { CorePermission } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';

/**
 * Org permissions reach "company" (the user's own company) or "all". A company outside the user's
 * reach does not exist for them (404), as for every scoped record.
 */
export function assertCompanyAccess(ctx: AccessContext, key: string, companyId: string): void {
  const scope = ctx.scopeOf(key);
  if (scope === 'all') return;
  if (scope === 'company' && ctx.placement.companyId === companyId) return;
  throw new NotFoundError('Company', companyId);
}

export const ORG_VIEW = CorePermission.OrgView;
export const ORG_MANAGE = CorePermission.OrgManage;
