import { Injectable } from '@nestjs/common';
import type { MeDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { NO_PLACEMENT, type AccessContext } from '../domain/access-context';
import { ProfileRepository } from '../domain/profile.repository';
import { SecuritySettingsService } from '../../auth/application/security-settings.service';
import { AuthenticatorService } from '../../auth/application/authenticator.service';
import { AdminModeService } from './admin-mode.service';
import { ImpersonationService, type SessionFacts } from './impersonation.service';
import { ListSettingsService } from '../../lists/application/list-settings.service';
import { PageVisibilityService } from './page-visibility.service';
import { UserAccessService } from './user-access.service';

/** The signed-in user's own profile (GET /api/me): identity, roles, placement and permissions. */
@Injectable()
export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly access: UserAccessService,
    private readonly authenticator: AuthenticatorService,
    private readonly adminMode: AdminModeService,
    private readonly pages: PageVisibilityService,
    private readonly lists: ListSettingsService,
    private readonly security: SecuritySettingsService,
    private readonly impersonation: ImpersonationService,
  ) {}

  async me(ctx: AccessContext, session: { mfaVerified: boolean; sessionId: string; facts?: SessionFacts & { createdAt?: Date | string } }): Promise<MeDto> {
    const user = await this.profiles.findUser(ctx.userId);
    if (!user) throw new NotFoundError('User', ctx.userId);
    const [roles, placements] = await Promise.all([this.access.rolesOf([user.id]), this.access.placementsOf([user.id])]);
    const impersonation = session.facts ? await this.impersonation.describe(session.facts) : null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      locale: user.locale,
      theme: user.theme,
      isActive: user.isActive,
      authenticatorEnabled: await this.authenticator.isEnabled(user.id),
      mfaVerified: session.mfaVerified,
      // Before the code is verified, and while working as someone else, nothing administrative is on offer.
      adminMode: session.mfaVerified && !impersonation ? await this.adminMode.status(ctx, session.sessionId) : { available: false, active: false, expiresAt: null },
      impersonation,
      impersonationEnabled: await this.impersonation.isEnabled(),
      roles: (roles.get(user.id) ?? []).map((r) => ({ id: r.id, nameAr: r.nameAr, nameEn: r.nameEn })),
      placement: placements.get(user.id) ?? NO_PLACEMENT,
      createdAt: user.createdAt.toISOString(),
      permissions: ctx.grants(),
      hiddenPages: await this.pages.hiddenFor(ctx),
      trustedDevicesEnabled: (await this.security.get('trustedDeviceDays')) > 0,
      listSettings: await this.lists.all(),
    };
  }
}
