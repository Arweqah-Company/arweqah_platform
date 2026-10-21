import { Module, OnModuleInit } from '@nestjs/common';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { CompaniesService } from './application/services/companies.service';
import { OrgDirectoryService } from './application/services/org-directory.service';
import { OrgLevelsService } from './application/services/org-levels.service';
import { OrgNodesService } from './application/services/org-nodes.service';
import { ORG_PERMISSIONS } from './domain/permissions/org.permissions';
import { OrgRepository } from './domain/contracts/org.repository';
import { TypeOrmOrgRepository } from './infrastructure/repositories/typeorm-org.repository';
import { CompaniesController } from './presentation/controllers/companies.controller';
import { OrgController } from './presentation/controllers/org.controller';

/** Companies and their dynamic structure: levels, units, job titles. Employees are placed through EmployeePlacementPort. */
@Module({
  controllers: [CompaniesController, OrgController],
  providers: [
    CompaniesService,
    OrgLevelsService,
    OrgNodesService,
    OrgDirectoryService,
    { provide: OrgRepository, useClass: TypeOrmOrgRepository },
  ],
  exports: [OrgDirectoryService, CompaniesService, OrgLevelsService, OrgNodesService],
})
export class OrgModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(ORG_PERMISSIONS);
  }
}
