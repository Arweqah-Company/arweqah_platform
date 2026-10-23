import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CorePermission,
  type CreateEmployeeResultDto,
  type EmployeeDto,
  type EmployeeListItemDto,
  type EmployeesSummaryDto,
  type InviteResultDto,
  type ManagerOptionDto,
  type Paginated,
} from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { EmployeesService } from '../../application/services/employees.service';
import { AssignRolesDto, CreateEmployeeDto, EmployeesQueryDto, ManagerSearchDto, TerminateEmployeeDto, UpdateEmployeeDto } from '../dtos/employee.dtos';


const P = CorePermission;

@ApiTags('employees')
@Controller('employees')
@HiddenWithPage('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermission(P.EmployeesView)
  list(@Access() ctx: AccessContext, @Query() query: EmployeesQueryDto): Promise<Paginated<EmployeeListItemDto>> {
    return this.employees.list(ctx, query);
  }

  /** Minimal employee list for the "direct manager" picker: any employee, only name and number. */
  @Get('managers')
  @RequirePermission(P.LookupsView)
  managers(@Query() query: ManagerSearchDto): Promise<ManagerOptionDto[]> {
    return this.employees.managers(query);
  }

  @Get('summary')
  @RequirePermission(P.EmployeesView)
  summary(@Access() ctx: AccessContext): Promise<EmployeesSummaryDto> {
    return this.employees.summary(ctx);
  }

  @Get(':id')
  @RequirePermission(P.EmployeesView)
  get(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<EmployeeDto> {
    return this.employees.get(ctx, id);
  }

  @Post()
  @RequirePermission(P.EmployeesCreate)
  create(@Access() ctx: AccessContext, @Body() body: CreateEmployeeDto, @CurrentUser() user: SessionUser): Promise<CreateEmployeeResultDto> {
    return this.employees.create(ctx, body, user.id);
  }

  @Put(':id')
  @RequirePermission(P.EmployeesUpdate)
  update(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateEmployeeDto, @CurrentUser() user: SessionUser): Promise<EmployeeDto> {
    return this.employees.update(ctx, id, body, user.id);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @RequirePermission(P.EmployeesDeactivate)
  deactivate(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<EmployeeDto> {
    return this.employees.setActive(ctx, id, false, user.id);
  }

  @Post(':id/activate')
  @HttpCode(200)
  @RequirePermission(P.EmployeesDeactivate)
  activate(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<EmployeeDto> {
    return this.employees.setActive(ctx, id, true, user.id);
  }

  @Post(':id/terminate')
  @HttpCode(200)
  @RequirePermission(P.EmployeesTerminate)
  terminate(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TerminateEmployeeDto, @CurrentUser() user: SessionUser): Promise<EmployeeDto> {
    return this.employees.terminate(ctx, id, body, user.id);
  }

  @Put(':id/roles')
  @RequirePermission(P.EmployeesAssignRoles)
  assignRoles(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AssignRolesDto, @CurrentUser() user: SessionUser): Promise<EmployeeDto> {
    return this.employees.assignRoles(ctx, id, body.roleIds, user.id);
  }

  @Post(':id/resend-invite')
  @HttpCode(200)
  @RequirePermission(P.EmployeesResendInvite)
  resendInvite(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<InviteResultDto> {
    return this.employees.resendInvite(ctx, id, user.id);
  }

  @Post(':id/reset-authenticator')
  @HttpCode(200)
  @RequirePermission(P.EmployeesResetAuthenticator)
  resetAuthenticator(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<InviteResultDto> {
    return this.employees.resetAuthenticator(ctx, id, user.id);
  }
}
