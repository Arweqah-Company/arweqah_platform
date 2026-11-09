import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { WorkflowRegistry } from '../../core/workflow/application/workflow-definition';
import { PerformanceCycleService } from './application/services/performance-cycle.service';
import { PerformanceTemplateService } from './application/services/performance-template.service';
import { PerformanceCycleRepository } from './domain/contracts/performance-cycle.repository';
import { PerformanceTemplateRepository } from './domain/contracts/performance-template.repository';
import { PERFORMANCE_CYCLE_ENTITIES } from './domain/entities/performance-cycles.entities';
import { PERFORMANCE_TEMPLATE_ENTITIES } from './domain/entities/performance-templates.entities';
import { PERFORMANCE_PERMISSIONS } from './domain/permissions/performance.permissions';
import { CYCLE_KEY, CYCLE_VERSION, cycleMachine } from './domain/rules/cycle.machine';
import { TypeOrmPerformanceCycleRepository } from './infrastructure/repositories/typeorm-performance-cycle.repository';
import { TypeOrmPerformanceTemplateRepository } from './infrastructure/repositories/typeorm-performance-template.repository';
import { PerformanceCycleController } from './presentation/controllers/performance-cycle.controller';
import { PerformanceTemplatesController } from './presentation/controllers/performance-templates.controller';

/** Performance evaluation: the evaluation file and its templates, and the cycle now; the self-evaluation, the manager's evaluation, the calibration and the objections come in later stages. */
@Module({
  imports: [TypeOrmModule.forFeature([...PERFORMANCE_TEMPLATE_ENTITIES, ...PERFORMANCE_CYCLE_ENTITIES])],
  controllers: [PerformanceTemplatesController, PerformanceCycleController],
  providers: [
    PerformanceTemplateService,
    PerformanceCycleService,
    { provide: PerformanceTemplateRepository, useClass: TypeOrmPerformanceTemplateRepository },
    { provide: PerformanceCycleRepository, useClass: TypeOrmPerformanceCycleRepository },
  ],
})
export class PerformanceModule implements OnModuleInit {
  constructor(
    private readonly catalog: PermissionCatalog,
    private readonly workflows: WorkflowRegistry,
  ) {}

  onModuleInit(): void {
    this.catalog.register(PERFORMANCE_PERMISSIONS);
    this.workflows.register({ key: CYCLE_KEY, version: CYCLE_VERSION, machine: cycleMachine });
  }
}
