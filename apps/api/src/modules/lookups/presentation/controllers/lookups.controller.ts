import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CorePermission,
  type JobTitleOptionDto,
  type Language,
  type LookupsDto,
  type OrgNodeOptionDto,
  type OrgReferenceDto,
} from '@arweqah-platform/shared';
import { RoleGroupsService } from '../../../../core/access/application/role-groups.service';
import { RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { LookupsService, type CompanyOptionDto } from '../../application/services/lookups.service';
import { CompanyQueryDto, OrgNodeQueryDto } from '../dtos/lookups.dtos';


/** Arabic is the fallback; only an explicit English preference switches `name`. */
export function languageOf(header: string | undefined): Language {
  return header?.toLowerCase().startsWith('en') ? 'en' : 'ar';
}

@ApiTags('lookups')
@Controller('lookups')
export class LookupsController {
  constructor(
    private readonly lookups: LookupsService,
    private readonly roleGroups: RoleGroupsService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.LookupsView)
  all(@Headers('accept-language') acceptLanguage?: string): Promise<LookupsDto> {
    return this.lookups.all(languageOf(acceptLanguage));
  }

  @Get('companies')
  @RequirePermission(CorePermission.LookupsView)
  companies(@Headers('accept-language') acceptLanguage?: string): Promise<CompanyOptionDto[]> {
    return this.lookups.companies(languageOf(acceptLanguage));
  }

  /** The role groups to choose from when giving a person groups (HR does not need the admin page for it). */
  @Get('role-groups')
  @RequirePermission(CorePermission.EmployeesAssignGroups)
  async roleGroupOptions(): Promise<{ id: string; nameAr: string; nameEn: string }[]> {
    return (await this.roleGroups.list()).map((g) => ({ id: g.id, nameAr: g.nameAr, nameEn: g.nameEn }));
  }

  @Get('org-nodes')
  @RequirePermission(CorePermission.LookupsView)
  orgNodes(@Query() { companyId }: CompanyQueryDto): Promise<OrgNodeOptionDto[]> {
    return this.lookups.orgNodes(companyId);
  }

  @Get('org-reference')
  @RequirePermission(CorePermission.LookupsView)
  orgReference(): Promise<OrgReferenceDto[]> {
    return this.lookups.orgReference();
  }

  @Get('job-titles')
  @RequirePermission(CorePermission.LookupsView)
  jobTitles(@Query() { orgNodeId }: OrgNodeQueryDto): Promise<JobTitleOptionDto[]> {
    return this.lookups.jobTitles(orgNodeId);
  }
}
