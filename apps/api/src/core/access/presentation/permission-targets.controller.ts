import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { assignPermissionsSchema, CorePermission, PERMISSION_TARGET_KINDS, type PermissionTargetDto } from '@arweqah-platform/shared';
import { PermissionTargetsService } from '../application/permission-targets.service';
import type { AccessContext } from '../domain/access-context';
import type { TargetRef } from '../domain/permission-target.repository';
import { IdParam } from '../../../common/presentation/zod-query';
import { Access, HiddenWithPage, RequireAdminMode, RequirePermission } from './require-permission.decorator';

class GrantsBody extends createZodDto(assignPermissionsSchema) {}
class KindParam extends createZodDto(z.strictObject({ kind: z.enum(PERMISSION_TARGET_KINDS) })) {}
class KindIdParam extends createZodDto(z.strictObject({ kind: z.enum(PERMISSION_TARGET_KINDS), id: z.uuid() })) {}
class SearchQuery extends createZodDto(z.strictObject({ q: z.string().trim().max(100).optional() })) {}

/** The permissions page: place permissions on a role, a group of roles, one person or a group of people. Each kind has its own key. */
@ApiTags('access')
@Controller('permission-targets')
@RequireAdminMode()
@HiddenWithPage('permissions')
export class PermissionTargetsController {
  constructor(private readonly targets: PermissionTargetsService) {}

  @Get(':kind')
  @RequirePermission(CorePermission.PermissionsView)
  list(@Param() { kind }: KindParam, @Query() { q }: SearchQuery): Promise<TargetRef[]> {
    return this.targets.list(kind, q);
  }

  @Get(':kind/:id')
  @RequirePermission(CorePermission.PermissionsView)
  get(@Param() { kind, id }: KindIdParam): Promise<PermissionTargetDto> {
    return this.targets.get(kind, id);
  }

  @Put('role/:id')
  @RequirePermission(CorePermission.PermissionsRoleUpdate)
  setRole(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: GrantsBody): Promise<PermissionTargetDto> {
    return this.targets.set(ctx, 'role', id, body.permissions);
  }

  @Put('role-group/:id')
  @RequirePermission(CorePermission.PermissionsRoleGroupUpdate)
  setRoleGroup(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: GrantsBody): Promise<PermissionTargetDto> {
    return this.targets.set(ctx, 'role-group', id, body.permissions);
  }

  @Put('user/:id')
  @RequirePermission(CorePermission.PermissionsUserUpdate)
  setUser(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: GrantsBody): Promise<PermissionTargetDto> {
    return this.targets.set(ctx, 'user', id, body.permissions);
  }

  @Put('user-group/:id')
  @RequirePermission(CorePermission.PermissionsUserGroupUpdate)
  setUserGroup(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: GrantsBody): Promise<PermissionTargetDto> {
    return this.targets.set(ctx, 'user-group', id, body.permissions);
  }
}
