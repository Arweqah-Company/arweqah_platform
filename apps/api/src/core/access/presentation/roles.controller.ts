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
import { HiddenWithPage, RequireAdminMode, RequirePermission } from './require-permission.decorator';

class UpsertRoleDto extends createZodDto(upsertRoleSchema) {}

@ApiTags('access')
@Controller()
export class RolesController {
  constructor(
    private readonly roles: RolesService,
    private readonly catalog: PermissionCatalog,
  ) {}

  /** security: self-scoped. The names of the permissions are not secret and the pickers of roles, groups and personal permissions all read them. */
  @Get('permissions/catalog')
  getCatalog(): PermissionCatalogGroup[] {
    return this.catalog.grouped();
  }

  @Get('roles')
  @RequirePermission(CorePermission.RolesView)
  list(): Promise<RoleDto[]> {
    return this.roles.list();
  }

  @Post('roles')
  @RequireAdminMode()
  @HiddenWithPage('roles')
  @RequirePermission(CorePermission.RolesCreate)
  create(@Body() body: UpsertRoleDto, @CurrentUser() user: SessionUser): Promise<RoleDto> {
    return this.roles.create(body, user.id);
  }

  @Put('roles/:id')
  @RequireAdminMode()
  @HiddenWithPage('roles')
  @RequirePermission(CorePermission.RolesUpdate)
  update(@Param() { id }: IdParam, @Body() body: UpsertRoleDto, @CurrentUser() user: SessionUser): Promise<RoleDto> {
    return this.roles.update(id, body, user.id);
  }

  @Delete('roles/:id')
  @RequireAdminMode()
  @HiddenWithPage('roles')
  @HttpCode(204)
  @RequirePermission(CorePermission.RolesDelete)
  async remove(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.roles.remove(id, user.id);
  }
}
