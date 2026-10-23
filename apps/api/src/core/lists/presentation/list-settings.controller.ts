import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CorePermission, listSettingsInputSchema, type ListSettingDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { RequireAdminMode, RequirePermission } from '../../access/presentation/require-permission.decorator';
import { ListSettingsService } from '../application/list-settings.service';

class ListSettingsBody extends createZodDto(listSettingsInputSchema) {}

/** List management: which columns and filters each list shows. Reading is part of GET /api/me; changing needs platform admin mode. */
@ApiTags('lists')
@Controller('list-settings')
@RequireAdminMode()
export class ListSettingsController {
  constructor(private readonly settings: ListSettingsService) {}

  @Put(':key')
  @RequirePermission(CorePermission.ListsManage)
  replace(@Param('key') key: string, @Body() body: ListSettingsBody, @CurrentUser() user: SessionUser): Promise<ListSettingDto> {
    return this.settings.replace(key, body, user.id);
  }
}
