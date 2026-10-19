import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  CorePermission,
  upsertRoleSchema,
  type PermissionCatalogGroup,
  type RoleDto,
} from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { PermissionCatalog } from '../application/permission-catalog';
import { RolesService } from '../application/roles.service';
import { RequirePermission } from './require-permission.decorator';

class UpsertRoleDto extends createZodDto(upsertRoleSchema) {}

@ApiTags('access')
@Controller()
export class RolesController {
  constructor(
    private readonly roles: RolesService,
    private readonly catalog: PermissionCatalog,
  ) {}

  @Get('permissions/catalog')
  @RequirePermission(CorePermission.RolesView)
  getCatalog(): PermissionCatalogGroup[] {
    return this.catalog.grouped();
  }

  @Get('roles')
  @RequirePermission(CorePermission.RolesView)
  list(): Promise<RoleDto[]> {
    return this.roles.list();
  }

  @Post('roles')
  @RequirePermission(CorePermission.RolesManage)
  create(@Body() body: UpsertRoleDto, @CurrentUser() user: SessionUser): Promise<RoleDto> {
    return this.roles.create(body, user.id);
  }

  @Put('roles/:id')
  @RequirePermission(CorePermission.RolesManage)
  update(@Param() { id }: IdParam, @Body() body: UpsertRoleDto, @CurrentUser() user: SessionUser): Promise<RoleDto> {
    return this.roles.update(id, body, user.id);
  }

  @Delete('roles/:id')
  @HttpCode(204)
  @RequirePermission(CorePermission.RolesManage)
  async remove(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.roles.remove(id, user.id);
  }
}
