import { Module, OnModuleInit } from '@nestjs/common';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { CompaniesService } from './application/services/companies.service';
import { JobTitleCodesService } from './application/services/job-title-codes.service';
import { JobTitlesService } from './application/services/job-titles.service';
import { OrgChainService } from './application/services/org-chain.service';
import { OrgLeadersService } from './application/services/org-leaders.service';
import { OrgVersionsService } from './application/services/org-versions.service';
import { OrgVisibilityService } from './application/services/org-visibility.service';
import { OrgDirectoryService } from './application/services/org-directory.service';
import { OrgLevelsService } from './application/services/org-levels.service';
import { OrgNodesService } from './application/services/org-nodes.service';
import { OrgTreeService } from './application/services/org-tree.service';
import { OrgUnitCodesService } from './application/services/org-unit-codes.service';
import { ORG_PERMISSIONS } from './domain/permissions/org.permissions';
import { OrgRepository } from './domain/contracts/org.repository';
import { JobTitleRepository } from './domain/contracts/job-title.repository';
import { OrgLeaderRepository } from './domain/contracts/org-leader.repository';
import { OrgVersionRepository } from './domain/contracts/org-version.repository';
import { OrgScheduleJob } from './infrastructure/jobs/org-schedule.job';
import { TypeOrmJobTitleRepository } from './infrastructure/repositories/typeorm-job-title.repository';
import { TypeOrmOrgLeaderRepository } from './infrastructure/repositories/typeorm-org-leader.repository';
import { TypeOrmOrgRepository } from './infrastructure/repositories/typeorm-org.repository';
import { TypeOrmOrgVersionRepository } from './infrastructure/repositories/typeorm-org-version.repository';
import { CompaniesController } from './presentation/controllers/companies.controller';
import { JobTitlesController } from './presentation/controllers/job-titles.controller';
import { OrgController } from './presentation/controllers/org.controller';

/** Companies and the group's one organization structure: unit types and rules, units, job titles. Employees are placed through EmployeePlacementPort. */
@Module({
  controllers: [CompaniesController, OrgController, JobTitlesController],
  providers: [
    CompaniesService,
    OrgLevelsService,
    OrgNodesService,
    OrgTreeService,
    OrgUnitCodesService,
    OrgDirectoryService,
    OrgVisibilityService,
    OrgVersionsService,
    OrgLeadersService,
    OrgChainService,
    JobTitlesService,
    JobTitleCodesService,
    OrgScheduleJob,
    { provide: OrgRepository, useClass: TypeOrmOrgRepository },
    { provide: OrgVersionRepository, useClass: TypeOrmOrgVersionRepository },
    { provide: OrgLeaderRepository, useClass: TypeOrmOrgLeaderRepository },
    { provide: JobTitleRepository, useClass: TypeOrmJobTitleRepository },
  ],
  exports: [OrgDirectoryService, JobTitlesService, CompaniesService, OrgLevelsService, OrgNodesService, OrgTreeService, OrgChainService, OrgLeadersService],
})
export class OrgModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(ORG_PERMISSIONS);
  }
}
