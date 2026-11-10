/**
 * The milestones of the year (FR-121). Under `/api/performance`.
 *
 *   GET    /team/:employeeId/milestones         MilestoneListDto  performance.milestone_view: a team member's milestones (404 outside the scope or without an evaluation)
 *   PUT    /team/:employeeId/milestones/:key    MilestoneListDto  performance.milestone_record: the minutes (404 for an unknown key; 422 MILESTONE_INVALID; 409 MILESTONE_NOT_RUNNING); tells the employee
 *   GET    /me/milestones                       MilestoneListDto  (own data): my milestones
 *   POST   /me/milestones/:key/acknowledge      MilestoneListDto  performance.milestone_ack: I read the minutes (404 when none were recorded)
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type MilestoneListDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, OwnData, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceMilestoneService } from '../../application/services/performance-milestone.service';
import { RecordMilestoneDto } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance')
export class PerformanceMilestonesController {
  constructor(private readonly milestones: PerformanceMilestoneService) {}

  @Get('team/:employeeId/milestones')
  @RequirePermission(CorePermission.PerformanceMilestoneView)
  ofMember(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string): Promise<MilestoneListDto> {
    return this.milestones.ofMember(ctx, employeeId);
  }

  @Put('team/:employeeId/milestones/:key')
  @RequirePermission(CorePermission.PerformanceMilestoneRecord)
  record(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('key') key: string, @Body() body: RecordMilestoneDto): Promise<MilestoneListDto> {
    return this.milestones.record(ctx, employeeId, key, body);
  }

  @Get('me/milestones')
  @OwnData()
  mine(@Access() ctx: AccessContext): Promise<MilestoneListDto> {
    return this.milestones.mine(ctx);
  }

  @Post('me/milestones/:key/acknowledge')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceMilestoneAck)
  acknowledge(@Access() ctx: AccessContext, @Param('key') key: string): Promise<MilestoneListDto> {
    return this.milestones.acknowledge(ctx, key);
  }
}
