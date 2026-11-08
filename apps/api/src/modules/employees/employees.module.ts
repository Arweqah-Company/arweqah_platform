import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { LookupsModule } from '../lookups/lookups.module';
import { EmployeeCareerPort } from '../career-profile/domain/contracts/employee-career.port';
import { EmployeePlacementPort } from '../org/domain/contracts/employee-placement.port';
import { OrgModule } from '../org/org.module';
import { EmployeeTransformer } from './application/transformers/employee.transformer';
import { EmployeeAssignmentsJob } from './infrastructure/jobs/employee-assignments.job';
import { EmployeeAssignmentsService } from './application/services/employee-assignments.service';
import { EmployeeAssignmentRepository } from './domain/contracts/employee-assignment.repository';
import { EmployeeAssignment } from './domain/entities/employee-assignment.entity';
import { TypeOrmEmployeeAssignmentRepository } from './infrastructure/repositories/typeorm-employee-assignment.repository';
import { EmployeeAssignmentsController } from './presentation/controllers/employee-assignments.controller';
import { EmployeeBulkController } from './presentation/controllers/employee-bulk.controller';
import { EmployeeBulkService } from './application/services/employee-bulk.service';
import { DirectoryController } from './presentation/controllers/directory.controller';
import { DirectoryService } from './application/services/directory.service';
import { EmployeePhotoController } from './presentation/controllers/employee-photo.controller';
import { EmployeeReachPolicy } from './application/policies/employee-reach.policy';
import { EmployeeEditPolicy } from './application/policies/employee-edit.policy';
import { EmployeeAutoManagerService } from './application/services/employee-auto-manager.service';
import { EmployeeAuditService } from './application/services/employee-audit.service';
import { EmployeePhotoService } from './application/services/employee-photo.service';
import { EmployeeHistoryController } from './presentation/controllers/employee-history.controller';
import { EmployeeLifecycleJob } from './infrastructure/jobs/employee-lifecycle.job';
import { EmployeeValidationService } from './application/services/employee-validation.service';
import { EmployeeProfileService } from './application/services/employee-profile.service';
import { EmployeesService } from './application/services/employees.service';
import { Employee } from './domain/entities/employee.entity';
import { DIRECTORY_PERMISSIONS, EMPLOYEE_PERMISSIONS } from './domain/permissions/employee.permissions';
import { EmployeeRepository } from './domain/contracts/employee.repository';
import { EmployeeCareerAdapter } from './infrastructure/adapters/employee-career.adapter';
import { EmployeePlacementAdapter } from './infrastructure/adapters/employee-placement.adapter';
import { TypeOrmEmployeeRepository } from './infrastructure/repositories/typeorm-employee.repository';
import { EmployeesController } from './presentation/controllers/employees.controller';
import { ProfileController } from './presentation/controllers/profile.controller';

/**
 * Global so the org module can use EmployeePlacementPort without importing this module
 * (employees depends on org, not the other way around).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeAssignment]), OrgModule, LookupsModule],
  controllers: [EmployeesController, EmployeeBulkController, EmployeeAssignmentsController, EmployeeHistoryController, EmployeePhotoController, DirectoryController, ProfileController],
  providers: [
    EmployeesService,
    EmployeeProfileService,
    EmployeeValidationService,
    EmployeeTransformer,
    EmployeeLifecycleJob,
    EmployeeAssignmentsService,
    EmployeeAutoManagerService,
    EmployeePhotoService,
    EmployeeReachPolicy,
    EmployeeEditPolicy,
    EmployeeAuditService,
    EmployeeBulkService,
    DirectoryService,
    EmployeeAssignmentsJob,
    { provide: EmployeeAssignmentRepository, useClass: TypeOrmEmployeeAssignmentRepository },
    { provide: EmployeeRepository, useClass: TypeOrmEmployeeRepository },
    { provide: EmployeePlacementPort, useClass: EmployeePlacementAdapter },
    { provide: EmployeeCareerPort, useClass: EmployeeCareerAdapter },
  ],
  exports: [EmployeePlacementPort, EmployeeCareerPort, EmployeeLifecycleJob, EmployeeAssignmentsService, EmployeeAutoManagerService],
})
export class EmployeesModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(EMPLOYEE_PERMISSIONS);
    this.catalog.register(DIRECTORY_PERMISSIONS);
  }
}
