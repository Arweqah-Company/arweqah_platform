import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { adminModeActivateSchema, type AdminModeDto } from '@arweqah-platform/shared';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';
import { AdminModeService } from '../application/admin-mode.service';
import type { AccessContext } from '../domain/access-context';
import { Access } from './require-permission.decorator';

class ActivateBody extends createZodDto(adminModeActivateSchema) {}

const sessionOf = (req: AuthenticatedRequest): string => req.session?.session.id ?? '';

/**
 * security: self-scoped. Every route acts on the caller's own session, so no permission key is needed;
 * AdminModeService decides whether this person may use admin mode at all.
 * Platform admin mode: on with a fresh authenticator code, off with one click, off by itself after idle time.
 */
@ApiTags('admin-mode')
@Controller('admin-mode')
export class AdminModeController {
  constructor(private readonly adminMode: AdminModeService) {}

  @Get()
  status(@Access() ctx: AccessContext, @Req() req: AuthenticatedRequest): Promise<AdminModeDto> {
    return this.adminMode.status(ctx, sessionOf(req));
  }

  @Post('activate')
  @HttpCode(200)
  activate(@Access() ctx: AccessContext, @Req() req: AuthenticatedRequest, @Body() { code }: ActivateBody): Promise<AdminModeDto> {
    return this.adminMode.activate(ctx, sessionOf(req), code);
  }

  @Post('deactivate')
  @HttpCode(204)
  async deactivate(@Access() ctx: AccessContext, @Req() req: AuthenticatedRequest): Promise<void> {
    await this.adminMode.deactivate(ctx, sessionOf(req));
  }
}
