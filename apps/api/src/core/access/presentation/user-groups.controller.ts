import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CorePermission, userGroupInputSchema, type UserGroupDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { UserGroupsService } from '../application/user-groups.service';
import type { TargetRef } from '../domain/permission-target.repository';
import { RequireAdminMode, RequirePermission } from './require-permission.decorator';

class UserGroupBody extends createZodDto(userGroupInputSchema) {}
class PeopleQuery extends createZodDto(z.strictObject({ q: z.string().trim().max(100).optional() })) {}

/** Groups of people: used by the permissions page (platform admin mode), each action with its own key. */
@ApiTags('access')
@Controller('user-groups')
@RequireAdminMode()
export class UserGroupsController {
  constructor(private readonly groups: UserGroupsService) {}

  @Get()
  @RequirePermission(CorePermission.UserGroupsView)
  list(): Promise<UserGroupDto[]> {
    return this.groups.list();
  }

  @Get('people')
  @RequirePermission(CorePermission.UserGroupsView)
  people(@Query() { q }: PeopleQuery): Promise<TargetRef[]> {
    return this.groups.searchPeople(q);
  }

  @Post()
  @RequirePermission(CorePermission.UserGroupsCreate)
  create(@Body() body: UserGroupBody, @CurrentUser() user: SessionUser): Promise<UserGroupDto> {
    return this.groups.create(body, user.id);
  }

  @Put(':id')
  @RequirePermission(CorePermission.UserGroupsUpdate)
  update(@Param() { id }: IdParam, @Body() body: UserGroupBody, @CurrentUser() user: SessionUser): Promise<UserGroupDto> {
    return this.groups.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(CorePermission.UserGroupsDelete)
  async remove(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.groups.remove(id, user.id);
  }
}
