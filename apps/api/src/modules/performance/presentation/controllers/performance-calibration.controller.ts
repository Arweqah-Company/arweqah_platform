/**
 * Calibration (FR-122). Under `/api/performance/calibration`.
 *
 *   GET    /?search&level&stage&adjusted&page&pageSize  CalibrationPageDto  performance.calibration_view: everyone of the cycle with the managers' score and the calibrated one, the distribution by level
 *   PUT    /:employeeId                                 CalibrationRowDto   performance.calibrate: the adjustment (half-point steps, ±10, a reason when not zero); 409 CALIBRATION_NOT_OPEN / CALIBRATION_WAITING
 *   POST   /approve                                     204                 performance.approve: freezes the results, tells everyone, moves the cycle to the notification stage (409 APPROVAL_NOT_OPEN)
 *   POST   /finish                                      204                 performance.calibrate: ends calibration and moves the cycle to approval; 409 while someone has no sent manager evaluation
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type CalibrationPageDto, type CalibrationRowDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceApprovalService } from '../../application/services/performance-approval.service';
import { PerformanceCalibrationService } from '../../application/services/performance-calibration.service';
import { AdjustCalibrationDto, CalibrationQueryDto } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance/calibration')
export class PerformanceCalibrationController {
  constructor(
    private readonly calibration: PerformanceCalibrationService,
    private readonly approval: PerformanceApprovalService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.PerformanceCalibrationView)
  list(@Query() query: CalibrationQueryDto): Promise<CalibrationPageDto> {
    return this.calibration.list(query);
  }

  @Post('approve')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceApprove)
  approve(@Access() ctx: AccessContext): Promise<void> {
    return this.approval.approve(ctx);
  }

  @Post('finish')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceCalibrate)
  finish(@Access() ctx: AccessContext): Promise<void> {
    return this.calibration.finish(ctx);
  }

  @Put(':employeeId')
  @RequirePermission(CorePermission.PerformanceCalibrate)
  adjust(@Access() ctx: AccessContext, @Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() body: AdjustCalibrationDto): Promise<CalibrationRowDto> {
    return this.calibration.adjust(ctx, employeeId, body);
  }
}
