import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { allowedEmailDomainsSchema, CorePermission, securitySettingsSchema, type AllowedEmailDomainsDto, type SecuritySettingsDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../access/presentation/require-permission.decorator';
import { AllowedEmailDomainsService } from '../application/allowed-email-domains.service';
import { SecuritySettingsService } from '../application/security-settings.service';

class SecuritySettingsBody extends createZodDto(securitySettingsSchema) {}
class EmailDomainsBody extends createZodDto(allowedEmailDomainsSchema) {}

/** The security numbers (trusted device days, request limit): a tab of the settings page, platform admin mode. */
@ApiTags('security')
@Controller('security-settings')
@RequireAdminMode()
export class SecuritySettingsController {
  constructor(
    private readonly settings: SecuritySettingsService,
    private readonly domains: AllowedEmailDomainsService,
  ) {}

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

  @Get('email-domains')
  @HiddenWithPage('security-settings')
  @RequirePermission(CorePermission.SecuritySettingsView)
  emailDomains(): Promise<AllowedEmailDomainsDto> {
    return this.domains.list();
  }

  /** Replaces the whole list of domains work e-mails may use (empty = no rule). */
  @Put('email-domains')
  @HiddenWithPage('security-settings')
  @RequirePermission(CorePermission.SecuritySettingsEdit)
  setEmailDomains(@Body() body: EmailDomainsBody, @CurrentUser() user: SessionUser): Promise<AllowedEmailDomainsDto> {
    return this.domains.replace(body.domains, user.id);
  }
}
