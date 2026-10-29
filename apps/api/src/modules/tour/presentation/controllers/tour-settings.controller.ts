import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type TourStepSettingDto, type TourStepsDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TourSettingsService } from '../../application/services/tour-settings.service';
import { TourOrderDto, TourStepEditDto, TourStepParamDto } from '../dtos/tour.dtos';

/** The welcome tour's settings: an administrator edits wording, switches steps on or off and reorders them (admin mode, like the other settings). */
@ApiTags('tour')
@Controller('tour-steps')
@RequireAdminMode()
@HiddenWithPage('tour-settings')
export class TourSettingsController {
  constructor(private readonly settings: TourSettingsService) {}

  @Get()
  @RequirePermission(CorePermission.TourSettingsView)
  list(): Promise<TourStepsDto> {
    return this.settings.list();
  }

  @Put('order')
  @RequirePermission(CorePermission.TourSettingsReorder)
  reorder(@Body() body: TourOrderDto, @CurrentUser() user: SessionUser): Promise<TourStepsDto> {
    return this.settings.reorder(body, user.id);
  }

  @Put(':key')
  @RequirePermission(CorePermission.TourSettingsEdit)
  edit(@Param() { key }: TourStepParamDto, @Body() body: TourStepEditDto, @CurrentUser() user: SessionUser): Promise<TourStepSettingDto> {
    return this.settings.edit(key, body, user.id);
  }

  @Post(':key/reset')
  @HttpCode(200)
  @RequirePermission(CorePermission.TourSettingsReset)
  reset(@Param() { key }: TourStepParamDto, @CurrentUser() user: SessionUser): Promise<TourStepSettingDto> {
    return this.settings.reset(key, user.id);
  }
}
