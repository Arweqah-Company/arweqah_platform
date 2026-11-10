/**
 * The manager's evaluation of the team (FR-120). Under `/api/performance/team`.
 *
 *   GET    /?search&scope&status&page&pageSize  TeamEvaluationPageDto  performance.team_view: the people the scope reaches with the viewer's state for each
 *   GET    /:employeeId                         TeamEvaluationDto      performance.team_view: one member's evaluation (404 outside the scope or without an evaluation)
 *   PUT    /:employeeId                         TeamEvaluationDto      performance.team_evaluate: keeps the form (409 EVALUATION_BLOCKED with the reason when it cannot be written now)
 *   POST   /:employeeId/send                    TeamEvaluationDto      performance.team_evaluate: sends it (complete, or 422 TEAM_EVALUATION_INVALID); the direct manager's first send tells the upper manager
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type TeamEvaluationDto, type TeamEvaluationPageDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceTeamService } from '../../application/services/performance-team.service';
import { SaveTeamEvaluationDto, TeamEvaluationQueryDto } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance/team')
export class PerformanceTeamController {
  constructor(private readonly team: PerformanceTeamService) {}

  @Get()
  @RequirePermission(CorePermission.PerformanceTeamView)
  list(@Access() ctx: AccessContext, @Query() query: TeamEvaluationQueryDto): Promise<TeamEvaluationPageDto> {
    return this.team.list(ctx, query);
  }

  @Get(':employeeId')
  @RequirePermission(CorePermission.PerformanceTeamView)
  one(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string): Promise<TeamEvaluationDto> {
    return this.team.one(ctx, employeeId);
  }

  @Put(':employeeId')
  @RequirePermission(CorePermission.PerformanceTeamEvaluate)
  save(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() body: SaveTeamEvaluationDto): Promise<TeamEvaluationDto> {
    return this.team.save(ctx, employeeId, body);
  }

  @Post(':employeeId/send')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceTeamEvaluate)
  send(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() body: SaveTeamEvaluationDto): Promise<TeamEvaluationDto> {
    return this.team.send(ctx, employeeId, body);
  }
}
