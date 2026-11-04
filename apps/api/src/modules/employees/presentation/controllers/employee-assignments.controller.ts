import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type EmployeeAssignmentsDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { EmployeeAssignmentsService } from '../../application/services/employee-assignments.service';
import { AssignmentParamsDto, ChangeAssignmentsDto } from '../dtos/employee.dtos';

const P = CorePermission;

/** The dated placement of an employee: unit, job title and direct manager with their history (FR-89). */
@ApiTags('employees')
@Controller('employees/:id/assignments')
@HiddenWithPage('employees')
export class EmployeeAssignmentsController {
  constructor(private readonly assignments: EmployeeAssignmentsService) {}

  @Get()
  @RequirePermission(P.EmployeesHistoryView)
  history(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<EmployeeAssignmentsDto> {
    return this.assignments.history(ctx, id);
  }

  @Post()
  @RequirePermission(P.EmployeesAssignChange)
  change(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: ChangeAssignmentsDto, @CurrentUser() user: SessionUser): Promise<EmployeeAssignmentsDto> {
    return this.assignments.change(ctx, id, body, user.id);
  }

  @Delete(':assignmentId')
  @HttpCode(200)
  @RequirePermission(P.EmployeesAssignChange)
  cancel(@Access() ctx: AccessContext, @Param() { id, assignmentId }: AssignmentParamsDto, @CurrentUser() user: SessionUser): Promise<EmployeeAssignmentsDto> {
    return this.assignments.cancel(ctx, id, assignmentId, user.id);
  }
}
