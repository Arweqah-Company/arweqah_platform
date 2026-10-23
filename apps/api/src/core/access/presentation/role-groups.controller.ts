import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CorePermission, roleGroupInputSchema, type RoleGroupDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { RoleGroupsService } from '../application/role-groups.service';
import { RequireAdminMode, RequirePermission } from './require-permission.decorator';

class RoleGroupBody extends createZodDto(roleGroupInputSchema) {}

/** Groups of roles: used by the permissions page (platform admin mode), each action with its own key. */
@ApiTags('access')
@Controller('role-groups')
@RequireAdminMode()
export class RoleGroupsController {
  constructor(private readonly groups: RoleGroupsService) {}

  @Get()
  @RequirePermission(CorePermission.RoleGroupsView)
  list(): Promise<RoleGroupDto[]> {
    return this.groups.list();
  }

  @Post()
  @RequirePermission(CorePermission.RoleGroupsCreate)
  create(@Body() body: RoleGroupBody, @CurrentUser() user: SessionUser): Promise<RoleGroupDto> {
    return this.groups.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission(CorePermission.RoleGroupsUpdate)
  update(@Param() { id }: IdParam, @Body() body: RoleGroupBody, @CurrentUser() user: SessionUser): Promise<RoleGroupDto> {
    return this.groups.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(CorePermission.RoleGroupsDelete)
  async remove(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.groups.remove(id, user.id);
  }
}
