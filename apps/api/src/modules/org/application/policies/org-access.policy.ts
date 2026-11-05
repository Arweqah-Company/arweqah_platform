import { CorePermission, isTreeScope } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';

/**
 * Org permissions reach "company" (the user's own company) or "all". Every unit is held by the group company, so a holder whose
 * company is another one reaches none of them for now (404, as for every scoped record); how a company-scoped key should read on
 * the one group tree is decided with the tickets and tasks stage.
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
export const ORG_VIEW_FULL = CorePermission.OrgViewFull;
export const ORG_UNIT_SHARE = CorePermission.OrgUnitShare;
export const ORG_CHARTER_EDIT = CorePermission.OrgCharterEdit;
export const ORG_LEADERS_MANAGE = CorePermission.OrgLeadersManage;
export const ORG_TITLES_EDIT_CONTENT = CorePermission.OrgTitlesEditContent;
export const JOB_TITLES_VIEW = CorePermission.JobTitlesView;
export const JOB_TITLES_CREATE = CorePermission.JobTitlesCreate;
export const JOB_TITLES_UPDATE = CorePermission.JobTitlesUpdate;
export const JOB_TITLES_DELETE = CorePermission.JobTitlesDelete;
export const JOB_TITLES_IMPORT = CorePermission.JobTitlesImport;
