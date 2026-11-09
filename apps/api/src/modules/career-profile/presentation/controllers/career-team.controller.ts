/**
 * «My career team» (FR-115): the people the viewer's scope reaches, read only. Under `/api/career/team`.
 *
 *   GET    /?search&status&page&pageSize           TeamPageDto          career_team.view: each person with the share of mandatory and necessary units, the hours, the late items and the state
 *   GET    /:employeeId                            TeamMemberDetailDto  career_team.view: one person with the proofs waiting for a decision (404 outside the scope)
 *   PUT    /:employeeId/competencies               CompetencyStatusDto[]  career_competency.record: the level reached for one competency of their title (null takes it back; 404 for a competency the title does not ask for)
 *   POST   /:employeeId/proofs/:id/approve         204                  career_team.decide: a proof referred to the manager
 *   POST   /:employeeId/proofs/:id/reject          204                  career_team.decide: with a reason
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type CompetencyStatusDto, type TeamMemberDetailDto, type TeamPageDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CareerCompetencyService } from '../../application/services/career-competency.service';
import { CareerReviewService } from '../../application/services/career-review.service';
import { CareerTeamService } from '../../application/services/career-team.service';
import { RecordCompetencyDto, RejectProofDto, TeamQueryDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career/team')
export class CareerTeamController {
  constructor(
    private readonly team: CareerTeamService,
    private readonly review: CareerReviewService,
    private readonly competencies: CareerCompetencyService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.CareerTeamView)
  list(@Access() ctx: AccessContext, @Query() query: TeamQueryDto): Promise<TeamPageDto> {
    return this.team.list(ctx, query);
  }

  @Get(':employeeId')
  @RequirePermission(CorePermission.CareerTeamView)
  member(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string): Promise<TeamMemberDetailDto> {
    return this.team.member(ctx, employeeId);
  }

  @Put(':employeeId/competencies')
  @RequirePermission(CorePermission.CareerCompetencyRecord)
  recordCompetency(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() body: RecordCompetencyDto): Promise<CompetencyStatusDto[]> {
    return this.competencies.record(ctx, employeeId, body);
  }

  @Post(':employeeId/proofs/:id/approve')
  @HttpCode(204)
  @RequirePermission(CorePermission.CareerTeamDecide)
  approve(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.review.teamApprove(ctx, employeeId, id);
  }

  @Post(':employeeId/proofs/:id/reject')
  @HttpCode(204)
  @RequirePermission(CorePermission.CareerTeamDecide)
  reject(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: RejectProofDto): Promise<void> {
    return this.review.teamReject(ctx, employeeId, id, body);
  }
}
