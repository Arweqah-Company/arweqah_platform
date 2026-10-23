import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CorePermission, rolePagesSchema, type PageVisibilityDto, type PageVisibilityRoleDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { PageVisibilityService } from '../application/page-visibility.service';
import { RequireAdminMode, RequirePermission } from './require-permission.decorator';

class RolePagesBody extends createZodDto(rolePagesSchema) {}

/** Page visibility: which pages each role sees. An admin page, so it needs platform admin mode. */
@ApiTags('access')
@Controller('page-visibility')
@RequireAdminMode()
export class PageVisibilityController {
  constructor(private readonly pages: PageVisibilityService) {}

  @Get()
  @RequirePermission(CorePermission.PagesManage)
  overview(): Promise<PageVisibilityDto> {
    return this.pages.overview();
  }

  @Put('roles/:id')
  @RequirePermission(CorePermission.PagesManage)
  setForRole(@Param() { id }: IdParam, @Body() body: RolePagesBody, @CurrentUser() user: SessionUser): Promise<PageVisibilityRoleDto> {
    return this.pages.setForRole(id, body, user.id);
  }
}
