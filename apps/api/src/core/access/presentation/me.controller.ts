import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { MeDto } from '@arweqah-platform/shared';
import { ProfileService } from '../application/profile.service';
import type { AccessContext } from '../domain/access-context';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';
import { Access, AllowBeforeMfa } from './require-permission.decorator';

@ApiTags('me')
@Controller()
export class MeController {
  constructor(private readonly profile: ProfileService) {}

  /** Reachable before the code is verified so the UI knows whether to ask for the code or to enroll the app. */
  @Get('me')
  @AllowBeforeMfa()
  me(@Access() ctx: AccessContext, @Req() req: AuthenticatedRequest): Promise<MeDto> {
    const session = req.session?.session;
    return this.profile.me(ctx, { mfaVerified: !!session?.mfaVerifiedAt, sessionId: session?.id ?? '', facts: session });
  }
}
