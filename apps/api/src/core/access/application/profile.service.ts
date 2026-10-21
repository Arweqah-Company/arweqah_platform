import { Injectable } from '@nestjs/common';
import type { MeDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { NO_PLACEMENT, type AccessContext } from '../domain/access-context';
import { ProfileRepository } from '../domain/profile.repository';
import { AuthenticatorService } from '../../auth/application/authenticator.service';
import { UserAccessService } from './user-access.service';

/** The signed-in user's own profile (GET /api/me): identity, roles, placement and permissions. */
@Injectable()
export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly access: UserAccessService,
    private readonly authenticator: AuthenticatorService,
  ) {}

  async me(ctx: AccessContext, session: { mfaVerified: boolean }): Promise<MeDto> {
    const user = await this.profiles.findUser(ctx.userId);
    if (!user) throw new NotFoundError('User', ctx.userId);
    const [roles, placements] = await Promise.all([this.access.rolesOf([user.id]), this.access.placementsOf([user.id])]);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      locale: user.locale,
      isActive: user.isActive,
      authenticatorEnabled: await this.authenticator.isEnabled(user.id),
      mfaVerified: session.mfaVerified,
      roles: (roles.get(user.id) ?? []).map((r) => ({ id: r.id, nameAr: r.nameAr, nameEn: r.nameEn })),
      placement: placements.get(user.id) ?? NO_PLACEMENT,
      createdAt: user.createdAt.toISOString(),
      permissions: ctx.grants(),
    };
  }
}
