import { Controller, HttpCode, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CorePermission } from '@arweqah-platform/shared';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';
import { ImpersonationService, type SessionFacts } from '../application/impersonation.service';
import type { AccessContext } from '../domain/access-context';
import { Access, RequireAdminMode, RequirePermission } from './require-permission.decorator';

const factsOf = (req: AuthenticatedRequest): SessionFacts => ({ id: req.session?.session.id ?? '', ...req.session?.session });

function sendCookies(res: Response, cookies: string[]): void {
  for (const cookie of cookies) res.append('Set-Cookie', cookie);
}

/**
 * «Sign in as»: a platform administrator works as another employee. Starting needs `impersonation.start` and platform admin mode;
 * going back needs no key (it acts on the caller's own session) and works even when the session ran out or the feature was switched off.
 */
@ApiTags('impersonation')
@Controller('impersonation')
export class ImpersonationController {
  constructor(private readonly impersonation: ImpersonationService) {}

  /** security: self-scoped. Registered before `:userId` so «stop» is never read as an id. */
  @Post('stop')
  @HttpCode(204)
  async stop(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    sendCookies(res, await this.impersonation.stop(factsOf(req)));
  }

  @Post(':userId')
  @HttpCode(204)
  @RequireAdminMode()
  @RequirePermission(CorePermission.ImpersonationStart)
  async start(@Access() ctx: AccessContext, @Req() req: AuthenticatedRequest, @Param('userId', ParseUUIDPipe) userId: string, @Res({ passthrough: true }) res: Response): Promise<void> {
    sendCookies(res, await this.impersonation.start(ctx, factsOf(req), userId));
  }
}
