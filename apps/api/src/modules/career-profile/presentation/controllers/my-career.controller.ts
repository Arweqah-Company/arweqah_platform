/**
 * The signed-in employee's own career path (FR-111, FR-112). Under `/api/career-profile`.
 *
 *   GET    /me               MyCareerProfileDto  career_profile.view: the content of the title they hold, once it is ready, and whether acknowledging is still required
 *   POST   /me/acknowledge   MyCareerProfileDto  career_acknowledge.create: the version they read (409 CAREER_CONTENT_STALE when a newer one exists; 403 in a «sign in as» session)
 */
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type MyCareerProfileDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CareerProfileService } from '../../application/services/career-profile.service';
import { AcknowledgeCareerDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career-profile')
export class MyCareerController {
  constructor(private readonly profile: CareerProfileService) {}

  @Get('me')
  @RequirePermission(CorePermission.CareerProfileView)
  me(@Access() ctx: AccessContext): Promise<MyCareerProfileDto> {
    return this.profile.me(ctx);
  }

  @Post('me/acknowledge')
  @HttpCode(200)
  @RequirePermission(CorePermission.CareerAcknowledgeCreate)
  acknowledge(@Access() ctx: AccessContext, @Body() body: AcknowledgeCareerDto): Promise<MyCareerProfileDto> {
    return this.profile.acknowledge(ctx, body);
  }
}
