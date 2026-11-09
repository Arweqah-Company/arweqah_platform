/**
 * The signed-in employee's own career path (FR-111, FR-112). Under `/api/career-profile`.
 *
 *   GET    /me               MyCareerProfileDto  career_profile.view: the content of the title they hold, once it is ready, and whether acknowledging is still required
 *   GET    /me/learning     LearningRecordDto[]  career_profile.view: the proofs they sent and their state
 *   POST   /me/learning     LearningRecordDto    career_learning.upload: a proof for a unit of their plan (a certificate needs its file; a waiting or approved unit is 422 CAREER_PROOF_REFUSED)
 *   GET    /me/progress     MyProgressDto  career_profile.view: units done, approved hours, the medals and the ticks of «required»
 *   PUT    /me/required/:index  MyProgressDto  career_required.tick: ticks or unticks an item (404 for an index the content does not have)
 *   POST   /me/acknowledge   MyCareerProfileDto  career_acknowledge.create: the version they read (409 CAREER_CONTENT_STALE when a newer one exists; 403 in a «sign in as» session)
 */
import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type LearningRecordDto, type MyCareerProfileDto, type MyProgressDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CareerProgressService } from '../../application/services/career-progress.service';
import { CareerProofService } from '../../application/services/career-proof.service';
import { CareerProfileService } from '../../application/services/career-profile.service';
import { AcknowledgeCareerDto, SetRequiredDto, SubmitProofDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career-profile')
export class MyCareerController {
  constructor(
    private readonly profile: CareerProfileService,
    private readonly proofs: CareerProofService,
    private readonly progress: CareerProgressService,
  ) {}

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

  @Get('me/learning')
  @RequirePermission(CorePermission.CareerProfileView)
  learning(@Access() ctx: AccessContext): Promise<LearningRecordDto[]> {
    return this.proofs.mine(ctx);
  }

  @Post('me/learning')
  @RequirePermission(CorePermission.CareerLearningUpload)
  submit(@Access() ctx: AccessContext, @Body() body: SubmitProofDto): Promise<LearningRecordDto> {
    return this.proofs.submit(ctx, body);
  }

  @Get('me/progress')
  @RequirePermission(CorePermission.CareerProfileView)
  myProgress(@Access() ctx: AccessContext): Promise<MyProgressDto> {
    return this.progress.mine(ctx);
  }

  @Put('me/required/:index')
  @RequirePermission(CorePermission.CareerRequiredTick)
  tick(@Access() ctx: AccessContext, @Param('index', ParseIntPipe) index: number, @Body() body: SetRequiredDto): Promise<MyProgressDto> {
    return this.progress.setRequired(ctx, index, body);
  }
}
