import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessContext } from '../domain/access-context';

export const REQUIRED_PERMISSION = 'required_permission';
export const SKIP_TWO_FACTOR_CHECK = 'skip_two_factor_check';

/** The caller needs this permission at any scope; services narrow by scope. */
export const RequirePermission = (key: string) => SetMetadata(REQUIRED_PERMISSION, key);

/** For routes a user must reach before enabling 2FA (profile, 2FA setup status). */
export const AllowWithoutTwoFactor = () => SetMetadata(SKIP_TWO_FACTOR_CHECK, true);

export interface RequestWithAccess extends Request {
  access?: AccessContext;
}

export const Access = createParamDecorator((_: unknown, ctx: ExecutionContext): AccessContext => {
  const access = ctx.switchToHttp().getRequest<RequestWithAccess>().access;
  if (!access) throw new Error('AccessContext missing: route is public or guard not registered');
  return access;
});
