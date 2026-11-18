import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type BasicRequestDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { EmployeeBasicRequestDecisionService } from '../../application/services/employee-basic-request-decision.service';
import { EmployeeBasicRequestService } from '../../application/services/employee-basic-request.service';
import { BasicRequestBodyDto, RejectBasicRequestBodyDto } from '../dtos/employee.dtos';

const P = CorePermission;

/** security: self-scoped. A person sees, sends and cancels only their own request to change basic data (FR-162). */
@ApiTags('profile')
@Controller('me/profile/basic-request')
export class ProfileBasicRequestController {
  constructor(private readonly requests: EmployeeBasicRequestService) {}

  @Get()
  @RequirePermission(P.ProfileView)
  mine(@Access() ctx: AccessContext): Promise<BasicRequestDto | null> {
    return this.requests.mine(ctx);
  }

  @Put()
  @RequirePermission(P.ProfileUpdateBasic)
  send(@Access() ctx: AccessContext, @Body() body: BasicRequestBodyDto): Promise<BasicRequestDto> {
    return this.requests.submit(ctx, body);
  }

  @Delete()
  @HttpCode(204)
  @RequirePermission(P.ProfileUpdateBasic)
  cancel(@Access() ctx: AccessContext): Promise<void> {
    return this.requests.cancel(ctx);
  }
}

/** HR's side of the same request: who holds «edit employees» for the employee and the fields asked for decides it (FR-162). */
@ApiTags('employees')
@Controller('employees/:id/basic-request')
export class EmployeeBasicRequestsController {
  constructor(private readonly decisions: EmployeeBasicRequestDecisionService) {}

  @Get()
  @RequirePermission(P.EmployeesUpdate)
  pending(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<BasicRequestDto | null> {
    return this.decisions.pending(ctx, id);
  }

  @Post('approve')
  @HttpCode(200)
  @RequirePermission(P.EmployeesUpdate)
  approve(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<BasicRequestDto> {
    return this.decisions.approve(ctx, id);
  }

  @Post('reject')
  @HttpCode(200)
  @RequirePermission(P.EmployeesUpdate)
  reject(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: RejectBasicRequestBodyDto): Promise<BasicRequestDto> {
    return this.decisions.reject(ctx, id, body);
  }
}
