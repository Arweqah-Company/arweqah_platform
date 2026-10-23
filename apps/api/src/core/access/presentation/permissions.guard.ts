import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError } from '../../../common/domain/domain-error';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';
import { AccessContextService } from '../application/access-context.service';
import type { AccessContext } from '../domain/access-context';
import { AccountDisabledError, MfaRequiredError, PageHiddenError } from '../domain/errors';
import { AdminModeService } from '../application/admin-mode.service';
import { PageVisibilityService } from '../application/page-visibility.service';
import { ALLOW_BEFORE_MFA, PAGE_KEY, REQUIRED_PERMISSION, REQUIRE_ADMIN_MODE, type RequestWithAccess } from './require-permission.decorator';

/**
 * Runs after the Better Auth guard. Attaches the AccessContext and enforces:
 * active account, the one-time code of the authenticator app (every session, every sign-in method),
 * @RequirePermission, @HiddenWithPage (the page is hidden from the caller's roles), and @RequireAdminMode (the admin pages need platform admin mode switched on).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessContextService,
    private readonly adminMode: AdminModeService,
    private readonly pages: PageVisibilityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & RequestWithAccess>();
    if (this.flag('PUBLIC', context) || !request.user) return true;

    const ctx = await this.access.forUser(request.user.id);
    if (!ctx || !ctx.isActive) throw new AccountDisabledError();
    request.access = ctx;

    this.assertCodeVerified(request, context);
    this.assertPermission(ctx, context);
    await this.assertPageVisible(ctx, context);
    if (this.flag(REQUIRE_ADMIN_MODE, context)) await this.adminMode.assertActive(ctx, request.session?.session.id ?? '');
    return true;
  }

  private assertCodeVerified(request: AuthenticatedRequest, context: ExecutionContext): void {
    if (!request.session?.session.mfaVerifiedAt && !this.flag(ALLOW_BEFORE_MFA, context)) throw new MfaRequiredError();
  }

  private assertPermission(ctx: AccessContext, context: ExecutionContext): void {
    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
    if (required && !ctx.has(required)) throw new ForbiddenError();
  }

  private async assertPageVisible(ctx: AccessContext, context: ExecutionContext): Promise<void> {
    const page = this.reflector.getAllAndOverride<string | undefined>(PAGE_KEY, [context.getHandler(), context.getClass()]);
    if (page && (await this.pages.hiddenFor(ctx)).some((hidden) => hidden === page)) throw new PageHiddenError();
  }

  private flag(key: string, context: ExecutionContext): boolean {
    return !!this.reflector.getAllAndOverride<boolean>(key, [context.getHandler(), context.getClass()]);
  }
}
