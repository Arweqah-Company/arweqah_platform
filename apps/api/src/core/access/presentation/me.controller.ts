import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { MeDto, MyAccessDto } from '@arweqah-platform/shared';
import { MyAccessService } from '../application/my-access.service';
import { ProfileService } from '../application/profile.service';
import type { AccessContext } from '../domain/access-context';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';
import { Access, AllowBeforeMfa, OwnData } from './require-permission.decorator';

@ApiTags('me')
@Controller()
export class MeController {
  constructor(
    private readonly profile: ProfileService,
    private readonly myAccess: MyAccessService,
  ) {}

  /** Reachable before the code is verified so the UI knows whether to ask for the code or to enroll the app. */
  @Get('me')
  @AllowBeforeMfa()
  me(@Access() ctx: AccessContext, @Req() req: AuthenticatedRequest): Promise<MeDto> {
    const session = req.session?.session;
    return this.profile.me(ctx, { mfaVerified: !!session?.mfaVerifiedAt, sessionId: session?.id ?? '', facts: session });
  }

  /** The person's own gate data (what the web hides and shows), so it needs no key: nobody is shut out of their own permissions. */
  @Get('me/access')
  @OwnData()
  access(@Access() ctx: AccessContext): Promise<MyAccessDto> {
    return this.myAccess.of(ctx);
  }
}
