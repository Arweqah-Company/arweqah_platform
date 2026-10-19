import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest, SessionUser } from './request-context';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new UnauthorizedException();
  return user;
});

/** Client IP for the audit log (behind nginx, `trust proxy` is enabled). */
export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | null => ctx.switchToHttp().getRequest<AuthenticatedRequest>().ip ?? null,
);
