import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission } from '@arweqah-platform/shared';
import type { ProblemReportAvailabilityDto, ProblemReportResultDto, ProblemReportSettingsDto, ProblemReportTypeOptionDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { viewerOf } from '../../application/policies/ticket-viewer';
import { ProblemReportSettingsService } from '../../application/services/problem-report-settings.service';
import { ProblemReportService } from '../../application/services/problem-report.service';
import { CreateProblemReportBody, ProblemReportSettingsBody } from '../dtos/problem-reports.dtos';

/** The «report a problem» button: any employee holding its key sends a report; the settings are the administrator's (admin mode). */
@ApiTags('tickets')
@Controller('problem-reports')
export class ProblemReportsController {
  constructor(private readonly reports: ProblemReportService) {}

  @Get('availability')
  @RequirePermission(CorePermission.TicketsReportProblem)
  availability(): Promise<ProblemReportAvailabilityDto> {
    return this.reports.availability();
  }

  @Post()
  @RequirePermission(CorePermission.TicketsReportProblem)
  create(@Access() ctx: AccessContext, @Body() body: CreateProblemReportBody): Promise<ProblemReportResultDto> {
    return this.reports.create(viewerOf(ctx), body);
  }
}

@ApiTags('tickets')
@Controller('problem-report-settings')
@RequireAdminMode()
@HiddenWithPage('problem-report-settings')
export class ProblemReportSettingsController {
  constructor(private readonly settings: ProblemReportSettingsService) {}

  @Get()
  @RequirePermission(CorePermission.TicketsReportSettingsView)
  get(): Promise<ProblemReportSettingsDto> {
    return this.settings.get();
  }

  @Get('types')
  @RequirePermission(CorePermission.TicketsReportSettingsView)
  types(): Promise<ProblemReportTypeOptionDto[]> {
    return this.settings.types();
  }

  @Put()
  @RequirePermission(CorePermission.TicketsReportSettingsEdit)
  update(@Body() body: ProblemReportSettingsBody, @CurrentUser() user: SessionUser): Promise<ProblemReportSettingsDto> {
    return this.settings.update(body, user.id);
  }
}
