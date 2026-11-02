import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CorePermission, securitySettingsSchema, type SecuritySettingsDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../access/presentation/require-permission.decorator';
import { SecuritySettingsService } from '../application/security-settings.service';

class SecuritySettingsBody extends createZodDto(securitySettingsSchema) {}

/** The security numbers (trusted device days, request limit): a tab of the settings page, platform admin mode. */
@ApiTags('security')
@Controller('security-settings')
@RequireAdminMode()
export class SecuritySettingsController {
  constructor(private readonly settings: SecuritySettingsService) {}

  @Get()
  @HiddenWithPage('security-settings')
  @RequirePermission(CorePermission.SecuritySettingsView)
  get(): Promise<SecuritySettingsDto> {
    return this.settings.all();
  }

  @Put()
  @HiddenWithPage('security-settings')
  @RequirePermission(CorePermission.SecuritySettingsEdit)
  update(@Body() body: SecuritySettingsBody, @CurrentUser() user: SessionUser): Promise<SecuritySettingsDto> {
    return this.settings.update(body, user.id);
  }
}
