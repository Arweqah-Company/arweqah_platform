/**
 * The evaluation cycle, for HR (FR-118). Under `/api/performance/cycle`.
 *
 *   GET     /                CycleStateDto  performance.cycle_view: the cycle in progress (or the last), the readiness list, the seven dates, the reminders list and the catalog
 *   POST    /open            CycleStateDto  performance.cycle_manage: opens the cycle of a fiscal year with a snapshot of the templates (409 while one is open or for a year that has one; 422 CYCLE_NOT_READY while the evaluation file is incomplete)
 *   POST    /advance         CycleStateDto  performance.cycle_manage: to the next stage (409 when none is open or at the last stage)
 *   POST    /close           CycleStateDto  performance.cycle_close: closes the cycle from any stage
 *   PUT     /dates/:key      CycleStateDto  performance.cycle_manage: sets a date of the open cycle, or of the next one when none is open (422 CYCLE_DATE_INVALID when it does not fit the others)
 *   POST    /reminders       ReminderDto    performance.reminders_manage: adds an automatic reminder (422 REMINDER_LIMIT past 30; the sending comes later)
 *   PUT     /reminders/:id   ReminderDto    performance.reminders_manage: changes it (404 when unknown)
 *   DELETE  /reminders/:id   204            performance.reminders_manage
 *   POST    /catalog         CatalogItemDto performance.catalog_manage: an item of the extra component
 *   DELETE  /catalog/:id     204            performance.catalog_manage
 */
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type CatalogItemDto, type CycleStateDto, type ReminderDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { PerformanceCycleService } from '../../application/services/performance-cycle.service';
import { PerformanceReminderService } from '../../application/services/performance-reminder.service';
import { CatalogItemDto as CatalogItemBody, CycleDateKeyParam, OpenCycleDto, ReminderBody, SetCycleDateDto } from '../dtos/performance.dtos';

@ApiTags('performance')
@Controller('performance/cycle')
export class PerformanceCycleController {
  constructor(
    private readonly cycle: PerformanceCycleService,
    private readonly reminders: PerformanceReminderService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.PerformanceCycleView)
  state(): Promise<CycleStateDto> {
    return this.cycle.state();
  }

  @Post('open')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceCycleManage)
  open(@Access() ctx: AccessContext, @Body() body: OpenCycleDto): Promise<CycleStateDto> {
    return this.cycle.open(ctx, body);
  }

  @Post('advance')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceCycleManage)
  advance(@Access() ctx: AccessContext): Promise<CycleStateDto> {
    return this.cycle.advance(ctx);
  }

  @Post('close')
  @HttpCode(200)
  @RequirePermission(CorePermission.PerformanceCycleClose)
  close(@Access() ctx: AccessContext): Promise<CycleStateDto> {
    return this.cycle.close(ctx);
  }

  @Put('dates/:key')
  @RequirePermission(CorePermission.PerformanceCycleManage)
  setDate(@Access() ctx: AccessContext, @Param() params: CycleDateKeyParam, @Body() body: SetCycleDateDto): Promise<CycleStateDto> {
    return this.cycle.setDate(ctx, params.key, body);
  }

  @Post('reminders')
  @RequirePermission(CorePermission.PerformanceRemindersManage)
  addReminder(@Access() ctx: AccessContext, @Body() body: ReminderBody): Promise<ReminderDto> {
    return this.reminders.create(ctx, body);
  }

  @Put('reminders/:id')
  @RequirePermission(CorePermission.PerformanceRemindersManage)
  changeReminder(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string, @Body() body: ReminderBody): Promise<ReminderDto> {
    return this.reminders.update(ctx, id, body);
  }

  @Delete('reminders/:id')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceRemindersManage)
  removeReminder(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.reminders.remove(ctx, id);
  }

  @Post('catalog')
  @RequirePermission(CorePermission.PerformanceCatalogManage)
  addItem(@Access() ctx: AccessContext, @Body() body: CatalogItemBody): Promise<CatalogItemDto> {
    return this.cycle.addItem(ctx, body);
  }

  @Delete('catalog/:id')
  @HttpCode(204)
  @RequirePermission(CorePermission.PerformanceCatalogManage)
  removeItem(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.cycle.removeItem(ctx, id);
  }
}
