import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { OwnProfileDto, SelfEditableFieldsDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { EmployeeProfileService } from '../../application/services/employee-profile.service';
import { UpdateOwnProfileDto } from '../dtos/employee.dtos';
import { RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';

/** security: self-scoped. A person reads and changes only their own page, so no permission key is needed (like /notifications). */
@ApiTags('profile')
@Controller('me/profile')
export class ProfileController {
  constructor(private readonly profile: EmployeeProfileService) {}

  @Get()
  @RequirePermission(CorePermission.ProfileView)
  get(@CurrentUser() user: SessionUser): Promise<OwnProfileDto> {
    return this.profile.get(user.id);
  }

  /** The fields the employee form leaves open to a plain employee editing their own record. */
  @Get('field-rules')
  @RequirePermission(CorePermission.ProfileView)
  fieldRules(): Promise<SelfEditableFieldsDto> {
    return this.profile.selfEditableFields();
  }

  @Put()
  @RequirePermission(CorePermission.ProfileUpdate)
  update(@CurrentUser() user: SessionUser, @Body() body: UpdateOwnProfileDto): Promise<OwnProfileDto> {
    return this.profile.update(user.id, body);
  }
}
