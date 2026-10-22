import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { OwnProfileDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { EmployeeProfileService } from '../../application/services/employee-profile.service';
import { UpdateOwnProfileDto } from '../dtos/employee.dtos';

/** security: self-scoped. A person reads and changes only their own page, so no permission key is needed (like /notifications). */
@ApiTags('profile')
@Controller('me/profile')
export class ProfileController {
  constructor(private readonly profile: EmployeeProfileService) {}

  @Get()
  get(@CurrentUser() user: SessionUser): Promise<OwnProfileDto> {
    return this.profile.get(user.id);
  }

  @Put()
  update(@CurrentUser() user: SessionUser, @Body() body: UpdateOwnProfileDto): Promise<OwnProfileDto> {
    return this.profile.update(user.id, body);
  }
}
