import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  assignRolesSchema,
  CorePermission,
  createUserSchema,
  placementSchema,
  usersQuerySchema,
  type MeDto,
  type Paginated,
  type UserDto,
} from '@arweqah-platform/shared';
import { IdParam } from '../../../common/presentation/zod-query';
import type { AccessContext } from '../../../core/access/domain/access-context';
import { Access, AllowWithoutTwoFactor, RequirePermission } from '../../../core/access/presentation/require-permission.decorator';
import { UsersService } from '../application/users.service';

class UsersQueryDto extends createZodDto(usersQuerySchema) {}
class CreateUserDto extends createZodDto(createUserSchema) {}
class AssignRolesDto extends createZodDto(assignRolesSchema) {}
class PlacementDto extends createZodDto(placementSchema) {}

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Reachable before 2FA is enabled so the UI can tell the user to set it up. */
  @Get('me')
  @AllowWithoutTwoFactor()
  me(@Access() ctx: AccessContext): Promise<MeDto> {
    return this.users.me(ctx);
  }

  @Get('users')
  @RequirePermission(CorePermission.UsersView)
  list(@Access() ctx: AccessContext, @Query() query: UsersQueryDto): Promise<Paginated<UserDto>> {
    return this.users.list(ctx, query);
  }

  @Get('users/:id')
  @RequirePermission(CorePermission.UsersView)
  get(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<UserDto> {
    return this.users.get(ctx, id);
  }

  @Post('users')
  @RequirePermission(CorePermission.UsersManage)
  create(@Access() ctx: AccessContext, @Body() body: CreateUserDto): Promise<UserDto> {
    return this.users.create(ctx, body);
  }

  @Put('users/:id/roles')
  @RequirePermission(CorePermission.UsersManage)
  assignRoles(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AssignRolesDto): Promise<UserDto> {
    return this.users.assignRoles(ctx, id, body.roleIds);
  }

  @Put('users/:id/placement')
  @RequirePermission(CorePermission.UsersManage)
  setPlacement(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: PlacementDto): Promise<UserDto> {
    return this.users.setPlacement(ctx, id, body);
  }

  @Post('users/:id/deactivate')
  @HttpCode(200)
  @RequirePermission(CorePermission.UsersManage)
  deactivate(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<UserDto> {
    return this.users.setActive(ctx, id, false);
  }

  @Post('users/:id/activate')
  @HttpCode(200)
  @RequirePermission(CorePermission.UsersManage)
  activate(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<UserDto> {
    return this.users.setActive(ctx, id, true);
  }
}
