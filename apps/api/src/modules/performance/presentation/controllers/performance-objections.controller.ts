/**
 * The objections of the cycle, for the approval holder (FR-123). Under `/api/performance/objections`.
 *
 *   GET    /                ObjectionListDto  performance.calibration_view: the objections of the cycle, newest first
 *   POST   /:id/return      204  performance.approve: accepts it and hands the evaluation back to the direct manager (409 OBJECTION_STATE unless open)
 *   POST   /:id/reject      204  performance.approve: refuses it with a written reason (10 characters)
 *   POST   /:id/finalize    204  performance.approve: approves the manager's revised evaluation (409 OBJECTION_STATE unless the manager re-sent)
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type ObjectionListDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceObjectionService } from '../../application/services/performance-objection.service';
import { RejectObjectionDto } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance/objections')
export class PerformanceObjectionsController {
  constructor(private readonly objections: PerformanceObjectionService) {}

  @Get()
  @RequirePermission(CorePermission.PerformanceCalibrationView)
  list(): Promise<ObjectionListDto> {
    return this.objections.list();
  }

  @Post(':id/return')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceApprove)
  returnIt(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.objections.returnIt(ctx, id);
  }

  @Post(':id/reject')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceApprove)
  reject(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string, @Body() body: RejectObjectionDto): Promise<void> {
    return this.objections.reject(ctx, id, body);
  }

  @Post(':id/finalize')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceApprove)
  finalize(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.objections.finalize(ctx, id);
  }
}
