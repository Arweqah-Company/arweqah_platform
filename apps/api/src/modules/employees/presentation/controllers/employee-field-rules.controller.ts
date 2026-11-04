import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type EmployeeFieldRuleDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { EmployeeFieldRulesService } from '../../application/services/employee-field-rules.service';
import { UpdateFieldRulesDto } from '../dtos/employee.dtos';

/** Who may change each detail of an employee: the page of platform administrators (FR-94). */
@ApiTags('employee-fields')
@Controller('employee-fields')
@RequireAdminMode()
@HiddenWithPage('employee-fields')
export class EmployeeFieldRulesController {
  constructor(private readonly rules: EmployeeFieldRulesService) {}

  @Get()
  @RequirePermission(CorePermission.EmployeeFieldsView)
  list(): Promise<EmployeeFieldRuleDto[]> {
    return this.rules.list();
  }

  @Put()
  @RequirePermission(CorePermission.EmployeeFieldsEdit)
  update(@Body() body: UpdateFieldRulesDto, @CurrentUser() user: SessionUser): Promise<EmployeeFieldRuleDto[]> {
    return this.rules.update(body, user.id);
  }
}
