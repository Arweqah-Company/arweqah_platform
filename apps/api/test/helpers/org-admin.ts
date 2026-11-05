import { CorePermission, ORG_ADMIN_PERMISSIONS, type PermissionGrant } from '@arweqah-platform/shared';
import { randomUUID } from 'node:crypto';
import { AccessContext, NO_PLACEMENT } from '../../src/core/access/domain/access-context';
import { ADMIN_MODE_GRANT, type TestAgent, type TestUser } from '../factories/factories';
import type { TestContext } from '../setup/test-app';

/** Every key of the structure and the job-titles page at every scope (the administrator of the structure). */
export const ORG_ADMIN_GRANTS: PermissionGrant[] = [ADMIN_MODE_GRANT, ...ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const }))];

/** The same grants with one key taken out (the 403 of that key). */
export const orgGrantsWithout = (key: string): PermissionGrant[] => ORG_ADMIN_GRANTS.filter((g) => g.key !== key);

/** An administrator of the structure, signed in with admin mode on. */
export async function orgAdmin(t: TestContext, grants: PermissionGrant[] = ORG_ADMIN_GRANTS): Promise<{ agent: TestAgent; user: TestUser }> {
  const user = await t.factories.user({ grants });
  return { agent: await t.factories.signInAdminMode(user), user };
}

/** A caller for service-level tests: holds the grants, no sign-in needed. */
export const orgContext = (grants: PermissionGrant[] = ORG_ADMIN_GRANTS): AccessContext => new AccessContext(randomUUID(), NO_PLACEMENT, grants.filter((g) => g.key !== CorePermission.AdminModeUse), true);
