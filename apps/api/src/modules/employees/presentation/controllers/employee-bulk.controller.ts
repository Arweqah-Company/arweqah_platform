import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type BulkUpdateResultDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { EmployeeBulkService } from '../../application/services/employee-bulk.service';
import { BulkUpdateDto } from '../dtos/employee.dtos';

/** One change for many employees, with a preview that says who would change and who would be refused (FR-93). */
@ApiTags('employees')
@Controller('employees/bulk-update')
@HiddenWithPage('employees')
export class EmployeeBulkController {
  constructor(private readonly bulk: EmployeeBulkService) {}

  @Post()
  @HttpCode(200)
  @RequirePermission(CorePermission.EmployeesBulkUpdate)
  run(@Access() ctx: AccessContext, @Body() body: BulkUpdateDto, @CurrentUser() user: SessionUser): Promise<BulkUpdateResultDto> {
    return this.bulk.run(ctx, body, user.id);
  }
}
