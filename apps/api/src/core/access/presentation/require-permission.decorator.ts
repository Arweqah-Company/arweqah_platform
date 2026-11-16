import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { HideablePage } from '@arweqah-platform/shared';
import type { AccessContext } from '../domain/access-context';
import { ALLOW_BEFORE_MFA, OWN_DATA, PAGE_KEY, REQUIRE_ADMIN_MODE, REQUIRED_PERMISSION } from '../domain/route-metadata-keys';

export { ALLOW_BEFORE_MFA, OWN_DATA, PAGE_KEY, REQUIRE_ADMIN_MODE, REQUIRED_PERMISSION };

/** The caller needs this permission at any scope; services narrow by scope. */
export const RequirePermission = (key: string) => SetMetadata(REQUIRED_PERMISSION, key);

/** The route belongs to the admin pages: it works only while platform admin mode is on in the session. */
export const RequireAdminMode = () => SetMetadata(REQUIRE_ADMIN_MODE, true);

/** The route serves one of the pages an administrator may hide from roles; it answers 403 `PAGE_HIDDEN` while the page is hidden from the caller. */
export const HiddenWithPage = (page: HideablePage) => SetMetadata(PAGE_KEY, page);

/** For routes reachable before the one-time code is verified (profile, entering the code, enrolling the app). */
export const AllowBeforeMfa = () => SetMetadata(ALLOW_BEFORE_MFA, true);

/** An explicit decision: the route answers only about the signed-in person (their own data), so it needs no key; the guard still requires a verified session. */
export const OwnData = () => SetMetadata(OWN_DATA, true);

export interface RequestWithAccess extends Request {
  access?: AccessContext;
}

export const Access = createParamDecorator((_: unknown, ctx: ExecutionContext): AccessContext => {
  const access = ctx.switchToHttp().getRequest<RequestWithAccess>().access;
  if (!access) throw new Error('AccessContext missing: route is public or guard not registered');
  return access;
});
