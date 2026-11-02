import { Controller, Delete, Get, HttpCode, Param, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type SessionDto, type TrustedDeviceDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { AuthenticatedRequest, SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { RequirePermission } from '../../access/presentation/require-permission.decorator';
import { SessionsService } from '../application/sessions.service';
import { TrustedDevicesService } from '../application/trusted-devices.service';
import { deviceSecretOf } from './device-cookie';

/** The person's own sign-in sessions and trusted browsers (the security page). */
@ApiTags('security')
@Controller('me')
export class SessionsController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly trusted: TrustedDevicesService,
  ) {}

  @Get('sessions')
  @RequirePermission(CorePermission.SecurityView)
  list(@CurrentUser() user: SessionUser, @Req() req: AuthenticatedRequest): Promise<SessionDto[]> {
    return this.sessions.list(user.id, req.session?.session.id ?? '');
  }

  /** Ends every other session of the person; the current one stays. */
  @Delete('sessions')
  @RequirePermission(CorePermission.SecurityView)
  async endOthers(@CurrentUser() user: SessionUser, @Req() req: AuthenticatedRequest): Promise<{ ended: number }> {
    return { ended: await this.sessions.endOthers(user.id, req.session?.session.id ?? '') };
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  @RequirePermission(CorePermission.SecurityView)
  async end(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.sessions.end(user.id, id);
  }

  @Get('trusted-devices')
  @RequirePermission(CorePermission.SecurityView)
  listTrusted(@CurrentUser() user: SessionUser, @Req() req: AuthenticatedRequest): Promise<TrustedDeviceDto[]> {
    return this.trusted.list(user.id, deviceSecretOf(req));
  }

  @Delete('trusted-devices/:id')
  @HttpCode(204)
  @RequirePermission(CorePermission.SecurityView)
  async removeTrusted(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.trusted.remove(user.id, id);
  }
}
