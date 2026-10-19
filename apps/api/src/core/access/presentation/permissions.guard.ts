import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError } from '../../../common/domain/domain-error';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';
import { AccessContextService } from '../application/access-context.service';
import { AccountDisabledError, TwoFactorRequiredError } from '../domain/errors';
import { REQUIRED_PERMISSION, SKIP_TWO_FACTOR_CHECK, type RequestWithAccess } from './require-permission.decorator';

/**
 * Runs after the Better Auth guard. Attaches the AccessContext and enforces:
 * active account, 2FA for roles that require it, and @RequirePermission.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & RequestWithAccess>();
    if (this.flag('PUBLIC', context) || !request.user) return true;

    const ctx = await this.access.forUser(request.user.id);
    if (!ctx || !ctx.isActive) throw new AccountDisabledError();
    request.access = ctx;

    if (ctx.requiresTwoFactor && !request.user.twoFactorEnabled && !this.flag(SKIP_TWO_FACTOR_CHECK, context)) {
      throw new TwoFactorRequiredError();
    }
    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && !ctx.has(required)) throw new ForbiddenError();
    return true;
  }

  private flag(key: string, context: ExecutionContext): boolean {
    return !!this.reflector.getAllAndOverride<boolean>(key, [context.getHandler(), context.getClass()]);
  }
}
