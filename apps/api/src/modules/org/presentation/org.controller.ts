import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CorePermission,
  upsertBranchSchema,
  upsertDepartmentSchema,
  upsertTeamSchema,
  type BranchDto,
  type DepartmentDto,
  type OrgTreeDto,
  type TeamDto,
} from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { IdParam } from '../../../common/presentation/zod-query';
import { RequirePermission } from '../../../core/access/presentation/require-permission.decorator';
import { toBranchDto, toDepartmentDto, toTeamDto } from '../application/org.mapper';
import { OrgService } from '../application/org.service';

class BranchDtoIn extends createZodDto(upsertBranchSchema) {}
class DepartmentDtoIn extends createZodDto(upsertDepartmentSchema) {}
class TeamDtoIn extends createZodDto(upsertTeamSchema) {}
class OrgUnitParam extends createZodDto(
  z.strictObject({ kind: z.enum(['branch', 'department', 'team']), id: z.uuid() }),
) {}

@ApiTags('org')
@Controller('org')
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get('tree')
  @RequirePermission(CorePermission.OrgView)
  tree(): Promise<OrgTreeDto> {
    return this.org.tree();
  }

  @Post('branches')
  @RequirePermission(CorePermission.OrgManage)
  async createBranch(@Body() body: BranchDtoIn, @CurrentUser() u: SessionUser): Promise<BranchDto> {
    return toBranchDto(await this.org.saveBranch(body, u.id));
  }

  @Put('branches/:id')
  @RequirePermission(CorePermission.OrgManage)
  async updateBranch(@Param() { id }: IdParam, @Body() body: BranchDtoIn, @CurrentUser() u: SessionUser): Promise<BranchDto> {
    return toBranchDto(await this.org.saveBranch(body, u.id, id));
  }

  @Post('departments')
  @RequirePermission(CorePermission.OrgManage)
  async createDepartment(@Body() body: DepartmentDtoIn, @CurrentUser() u: SessionUser): Promise<DepartmentDto> {
    return toDepartmentDto(await this.org.saveDepartment(body, u.id));
  }

  @Put('departments/:id')
  @RequirePermission(CorePermission.OrgManage)
  async updateDepartment(@Param() { id }: IdParam, @Body() body: DepartmentDtoIn, @CurrentUser() u: SessionUser): Promise<DepartmentDto> {
    return toDepartmentDto(await this.org.saveDepartment(body, u.id, id));
  }

  @Post('teams')
  @RequirePermission(CorePermission.OrgManage)
  async createTeam(@Body() body: TeamDtoIn, @CurrentUser() u: SessionUser): Promise<TeamDto> {
    return toTeamDto(await this.org.saveTeam(body, u.id));
  }

  @Put('teams/:id')
  @RequirePermission(CorePermission.OrgManage)
  async updateTeam(@Param() { id }: IdParam, @Body() body: TeamDtoIn, @CurrentUser() u: SessionUser): Promise<TeamDto> {
    return toTeamDto(await this.org.saveTeam(body, u.id, id));
  }

  @Delete(':kind/:id')
  @HttpCode(204)
  @RequirePermission(CorePermission.OrgManage)
  async remove(@Param() params: OrgUnitParam, @CurrentUser() u: SessionUser): Promise<void> {
    await this.org.remove(params.kind, params.id, u.id);
  }
}
