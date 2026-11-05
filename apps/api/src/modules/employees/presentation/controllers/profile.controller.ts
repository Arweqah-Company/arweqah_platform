import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { OwnProfileDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeeProfileService } from '../../application/services/employee-profile.service';
import { UpdateOwnProfileDto } from '../dtos/employee.dtos';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';

/** security: self-scoped. A person reads and changes only their own page, so no permission key is needed (like /notifications). */
@ApiTags('profile')
@Controller('me/profile')
export class ProfileController {
  constructor(private readonly profile: EmployeeProfileService) {}

  @Get()
  @RequirePermission(CorePermission.ProfileView)
  get(@Access() ctx: AccessContext): Promise<OwnProfileDto> {
    return this.profile.get(ctx);
  }

  @Put()
  @RequirePermission(CorePermission.ProfileUpdate)
  update(@Access() ctx: AccessContext, @Body() body: UpdateOwnProfileDto): Promise<OwnProfileDto> {
    return this.profile.update(ctx, body);
  }
}
