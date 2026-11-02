import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CorePermission, exceptionRefSchema, setExceptionExpirySchema, type AccessExceptionDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { AccessExceptionsService } from '../application/access-exceptions.service';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from './require-permission.decorator';

class ExceptionRefParams extends createZodDto(exceptionRefSchema) {}
class ExpiryBody extends createZodDto(setExceptionExpirySchema) {}

/** The exceptions page (platform admin mode): what was given outside the job title, with its last day, and the actions on it. */
@ApiTags('access')
@Controller('access/exceptions')
@RequireAdminMode()
export class AccessExceptionsController {
  constructor(private readonly exceptions: AccessExceptionsService) {}

  @Get()
  @HiddenWithPage('exceptions')
  @RequirePermission(CorePermission.ExceptionsView)
  list(): Promise<AccessExceptionDto[]> {
    return this.exceptions.list();
  }

  @Put(':kind/:userId/:targetId')
  @HiddenWithPage('exceptions')
  @RequirePermission(CorePermission.ExceptionsUpdate)
  async setExpiry(@Param() ref: ExceptionRefParams, @Body() body: ExpiryBody, @CurrentUser() user: SessionUser): Promise<void> {
    await this.exceptions.setExpiry(ref, body, user.id);
  }

  @Delete(':kind/:userId/:targetId')
  @HttpCode(204)
  @HiddenWithPage('exceptions')
  @RequirePermission(CorePermission.ExceptionsRevoke)
  async revoke(@Param() ref: ExceptionRefParams, @CurrentUser() user: SessionUser): Promise<void> {
    await this.exceptions.revoke(ref, user.id);
  }
}
