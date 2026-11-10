import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { WorkflowRegistry } from '../../core/workflow/application/workflow-definition';
import { MyPerformanceController } from './presentation/controllers/my-performance.controller';
import { PerformanceEvaluationService } from './application/services/performance-evaluation.service';
import { PerformanceCalibrationService } from './application/services/performance-calibration.service';
import { PerformanceApprovalService } from './application/services/performance-approval.service';
import { PerformanceObjectionService } from './application/services/performance-objection.service';
import { PerformanceResultService } from './application/services/performance-result.service';
import { PerformanceObjectionRepository, PerformanceResultRepository } from './domain/contracts/performance-result.repository';
import { TypeOrmPerformanceObjectionRepository, TypeOrmPerformanceResultRepository } from './infrastructure/repositories/typeorm-performance-result.repository';
import { PerformanceObjectionsController } from './presentation/controllers/performance-objections.controller';
import { PerformanceMilestoneService } from './application/services/performance-milestone.service';
import { PerformanceMilestoneRepository } from './domain/contracts/performance-milestone.repository';
import { PERFORMANCE_MILESTONE_ENTITIES } from './domain/entities/performance-milestones.entities';
import { TypeOrmPerformanceMilestoneRepository } from './infrastructure/repositories/typeorm-performance-milestone.repository';
import { PerformanceMilestonesController } from './presentation/controllers/performance-milestones.controller';
import { PerformanceScoreService } from './application/services/performance-score.service';
import { PerformanceCalibrationRepository } from './domain/contracts/performance-calibration.repository';
import { PERFORMANCE_RESULT_ENTITIES } from './domain/entities/performance-results.entities';
import { TypeOrmPerformanceCalibrationRepository } from './infrastructure/repositories/typeorm-performance-calibration.repository';
import { PerformanceCalibrationController } from './presentation/controllers/performance-calibration.controller';
import { PerformanceTeamService } from './application/services/performance-team.service';
import { PerformanceTeamController } from './presentation/controllers/performance-team.controller';
import { PerformanceNoticeService } from './application/services/performance-notice.service';
import { PerformanceSelfService } from './application/services/performance-self.service';
import { PerformanceEvaluationRepository } from './domain/contracts/performance-evaluation.repository';
import { PerformanceStagePort } from './domain/contracts/performance-roster.port';
import { PERFORMANCE_EVALUATION_ENTITIES } from './domain/entities/performance-evaluations.entities';
import { OrgStageAdapter } from './infrastructure/adapters/org-stage.adapter';
import { TypeOrmPerformanceEvaluationRepository } from './infrastructure/repositories/typeorm-performance-evaluation.repository';
import { OrgModule } from '../org/org.module';
import { PerformanceCycleService } from './application/services/performance-cycle.service';
import { PerformanceReminderService } from './application/services/performance-reminder.service';
import { PerformanceTemplateAiService } from './application/services/performance-template-ai.service';
import { PerformanceTemplateService } from './application/services/performance-template.service';
import { PerformanceCycleRepository } from './domain/contracts/performance-cycle.repository';
import { PerformanceReminderRepository } from './domain/contracts/performance-reminder.repository';
import { PerformanceTemplateRepository } from './domain/contracts/performance-template.repository';
import { PERFORMANCE_CYCLE_ENTITIES } from './domain/entities/performance-cycles.entities';
import { PERFORMANCE_REMINDER_ENTITIES } from './domain/entities/performance-reminders.entities';
import { PERFORMANCE_TEMPLATE_ENTITIES } from './domain/entities/performance-templates.entities';
import { PERFORMANCE_PERMISSIONS } from './domain/permissions/performance.permissions';
import { CYCLE_KEY, CYCLE_VERSION, cycleMachine } from './domain/rules/cycle.machine';
import { TypeOrmPerformanceCycleRepository } from './infrastructure/repositories/typeorm-performance-cycle.repository';
import { TypeOrmPerformanceReminderRepository } from './infrastructure/repositories/typeorm-performance-reminder.repository';
import { TypeOrmPerformanceTemplateRepository } from './infrastructure/repositories/typeorm-performance-template.repository';
import { PerformanceCycleController } from './presentation/controllers/performance-cycle.controller';
import { PerformanceTemplatesController } from './presentation/controllers/performance-templates.controller';

/** Performance evaluation: the evaluation file and its templates, and the cycle now; the self-evaluation, the manager's evaluation, the calibration and the objections come in later stages. */
@Module({
  imports: [TypeOrmModule.forFeature([...PERFORMANCE_TEMPLATE_ENTITIES, ...PERFORMANCE_CYCLE_ENTITIES, ...PERFORMANCE_EVALUATION_ENTITIES, ...PERFORMANCE_REMINDER_ENTITIES, ...PERFORMANCE_RESULT_ENTITIES, ...PERFORMANCE_MILESTONE_ENTITIES]), OrgModule],
  controllers: [PerformanceTemplatesController, PerformanceCycleController, MyPerformanceController, PerformanceTeamController, PerformanceCalibrationController, PerformanceObjectionsController, PerformanceMilestonesController],
  providers: [
    PerformanceTemplateService,
    PerformanceTemplateAiService,
    PerformanceCycleService,
    PerformanceReminderService,
    PerformanceEvaluationService,
    PerformanceSelfService,
    PerformanceTeamService,
    PerformanceScoreService,
    PerformanceCalibrationService,
    PerformanceApprovalService,
    PerformanceMilestoneService,
    { provide: PerformanceMilestoneRepository, useClass: TypeOrmPerformanceMilestoneRepository },
    PerformanceObjectionService,
    PerformanceResultService,
    { provide: PerformanceResultRepository, useClass: TypeOrmPerformanceResultRepository },
    { provide: PerformanceObjectionRepository, useClass: TypeOrmPerformanceObjectionRepository },
    { provide: PerformanceCalibrationRepository, useClass: TypeOrmPerformanceCalibrationRepository },
    PerformanceNoticeService,
    { provide: PerformanceStagePort, useClass: OrgStageAdapter },
    { provide: PerformanceEvaluationRepository, useClass: TypeOrmPerformanceEvaluationRepository },
    { provide: PerformanceTemplateRepository, useClass: TypeOrmPerformanceTemplateRepository },
    { provide: PerformanceCycleRepository, useClass: TypeOrmPerformanceCycleRepository },
    { provide: PerformanceReminderRepository, useClass: TypeOrmPerformanceReminderRepository },
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
