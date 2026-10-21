import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { LookupsModule } from '../lookups/lookups.module';
import { EmployeePlacementPort } from '../org/domain/contracts/employee-placement.port';
import { OrgModule } from '../org/org.module';
import { EmployeeTransformer } from './application/transformers/employee.transformer';
import { EmployeeLifecycleJob } from './infrastructure/jobs/employee-lifecycle.job';
import { EmployeeValidationService } from './application/services/employee-validation.service';
import { EmployeesService } from './application/services/employees.service';
import { Employee } from './domain/entities/employee.entity';
import { EMPLOYEE_PERMISSIONS } from './domain/permissions/employee.permissions';
import { EmployeeRepository } from './domain/contracts/employee.repository';
import { EmployeePlacementAdapter } from './infrastructure/adapters/employee-placement.adapter';
import { TypeOrmEmployeeRepository } from './infrastructure/repositories/typeorm-employee.repository';
import { EmployeesController } from './presentation/controllers/employees.controller';

/**
 * Global so the org module can use EmployeePlacementPort without importing this module
 * (employees depends on org, not the other way around).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Employee]), OrgModule, LookupsModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeeValidationService,
    EmployeeTransformer,
    EmployeeLifecycleJob,
    { provide: EmployeeRepository, useClass: TypeOrmEmployeeRepository },
    { provide: EmployeePlacementPort, useClass: EmployeePlacementAdapter },
  ],
  exports: [EmployeePlacementPort, EmployeeLifecycleJob],
})
export class EmployeesModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(EMPLOYEE_PERMISSIONS);
  }
}
