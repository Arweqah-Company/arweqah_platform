import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type EmployeeChangeDto, type Paginated } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { EmployeeAssignmentsService } from '../../application/services/employee-assignments.service';
import { EmployeeChangesQueryDto } from '../dtos/employee.dtos';

/** The change log of an employee's record: what was done, by whom and when (FR-90). */
@ApiTags('employees')
@Controller('employees/:id/changes')
@HiddenWithPage('employees')
export class EmployeeHistoryController {
  constructor(private readonly assignments: EmployeeAssignmentsService) {}

  @Get()
  @RequirePermission(CorePermission.EmployeesHistoryView)
  changes(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Query() query: EmployeeChangesQueryDto): Promise<Paginated<EmployeeChangeDto>> {
    return this.assignments.changes(ctx, id, query);
  }
}
