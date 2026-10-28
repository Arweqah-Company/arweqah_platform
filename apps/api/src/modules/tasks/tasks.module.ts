import { TemplateRegistry } from '../../core/templates/application/services/template-registry';
import { TASK_TEMPLATES } from './application/messages/task-templates';
import { Module, OnModuleInit } from '@nestjs/common';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { WorkflowRegistry } from '../../core/workflow/application/workflow-definition';
import { OrgModule } from '../org/org.module';
import { TaskAccessPolicy } from './application/policies/task-access.policy';
import { TaskCommentAccessPolicy } from './application/policies/task-comment-access.policy';
import { TaskCommentInputPolicy } from './application/policies/task-comment-input.policy';
import { TaskViewerFactory } from './application/policies/task-viewer';
import { TaskCommentRulesService } from './application/services/task-comment-rules.service';
import { TaskCommentService } from './application/services/task-comment.service';
import { TaskCommentTransformer } from './application/transformers/task-comment.transformer';
import { TaskCommentRepository } from './domain/contracts/task-comment.repository';
import { TypeOrmTaskCommentRepository } from './infrastructure/repositories/typeorm-task-comment.repository';
import { TaskCommentRulesController } from './presentation/controllers/task-comment-rules.controller';
import { TaskCommentsController } from './presentation/controllers/task-comments.controller';
import { TaskApprovalService } from './application/services/task-approval.service';
import { TaskObjectionService } from './application/services/task-objection.service';
import { TaskArchiveService } from './application/services/task-archive.service';
import { TaskHandoverService } from './application/services/task-handover.service';
import { TaskRecurrenceService } from './application/services/task-recurrence.service';
import { TaskReminderService } from './application/services/task-reminder.service';
import { TaskSummaryService } from './application/services/task-summary.service';
import { TaskTagService } from './application/services/task-tag.service';
import { TaskTimeService } from './application/services/task-time.service';
import { TaskNotifier } from './application/services/task-notifier.service';
import { TaskPolicyService } from './application/services/task-policy.service';
import { TaskQueryService } from './application/services/task-query.service';
import { TaskTransitionService } from './application/services/task-transition.service';
import { TasksService } from './application/services/tasks.service';
import { TaskTransformer } from './application/transformers/task.transformer';
import { TaskDirectory } from './domain/contracts/task-directory.port';
import { TaskMaintenanceRepository } from './domain/contracts/task-maintenance.repository';
import { TaskPolicyRepository } from './domain/contracts/task-policy.repository';
import { TaskProjectMembers } from './domain/contracts/task-project-members.port';
import { TaskTagRepository } from './domain/contracts/task-tag.repository';
import { TaskSummaryRepository } from './domain/contracts/task-summary.repository';
import { TaskTicketParticipants } from './domain/contracts/task-ticket-participants.port';
import { TaskRepository } from './domain/contracts/task.repository';
import { TASK_PERMISSIONS } from './domain/permissions/tasks.permissions';
import { TASK_APPROVAL_KEY, TASK_APPROVAL_VERSION, taskApprovalMachine } from './domain/rules/task-approval.machine';
import { TaskDailyJob } from './infrastructure/jobs/task-daily.job';
import { TaskHandoverConsumer } from './infrastructure/jobs/task-handover.consumer';
import { TaskObjectionExpiryJob } from './infrastructure/jobs/task-objection-expiry.job';
import { NoProjectMembersAdapter } from './infrastructure/adapters/no-project-members.adapter';
import { TypeOrmTaskTicketParticipants } from './infrastructure/adapters/typeorm-task-ticket-participants';
import { TypeOrmTaskDirectory } from './infrastructure/repositories/typeorm-task-directory';
import { TypeOrmTaskMaintenanceRepository } from './infrastructure/repositories/typeorm-task-maintenance.repository';
import { TypeOrmTaskPolicyRepository } from './infrastructure/repositories/typeorm-task-policy.repository';
import { TypeOrmTaskSummaryRepository } from './infrastructure/repositories/typeorm-task-summary.repository';
import { TypeOrmTaskTagRepository } from './infrastructure/repositories/typeorm-task-tag.repository';
import { TypeOrmTaskRepository } from './infrastructure/repositories/typeorm-task.repository';
import { TaskPoliciesController } from './presentation/controllers/task-policies.controller';
import { TaskTagsController } from './presentation/controllers/task-tags.controller';
import { TasksController } from './presentation/controllers/tasks.controller';

/** Tasks: what an employee must do, what they asked of others and what they follow; managers see their team's. */
@Module({
  imports: [OrgModule],
  // The fixed paths (tags, policies) have their own controllers; `tasks/:id` is last in its own.
  controllers: [TaskTagsController, TaskPoliciesController, TaskCommentRulesController, TaskCommentsController, TasksController],
  providers: [
    TasksService,
    TaskQueryService,
    TaskTransitionService,
    TaskApprovalService,
    TaskObjectionService,
    TaskObjectionExpiryJob,
    TaskArchiveService,
    TaskHandoverService,
    TaskRecurrenceService,
    TaskReminderService,
    TaskTimeService,
    TaskTagService,
    TaskSummaryService,
    TaskDailyJob,
    TaskHandoverConsumer,
    TaskPolicyService,
    TaskCommentService,
    TaskCommentRulesService,
    TaskCommentAccessPolicy,
    TaskCommentInputPolicy,
    TaskCommentTransformer,
    TaskNotifier,
    TaskAccessPolicy,
    TaskViewerFactory,
    TaskTransformer,
    { provide: TaskRepository, useClass: TypeOrmTaskRepository },
    { provide: TaskDirectory, useClass: TypeOrmTaskDirectory },
    { provide: TaskMaintenanceRepository, useClass: TypeOrmTaskMaintenanceRepository },
    { provide: TaskPolicyRepository, useClass: TypeOrmTaskPolicyRepository },
    { provide: TaskSummaryRepository, useClass: TypeOrmTaskSummaryRepository },
    { provide: TaskCommentRepository, useClass: TypeOrmTaskCommentRepository },
    { provide: TaskTagRepository, useClass: TypeOrmTaskTagRepository },
    { provide: TaskTicketParticipants, useClass: TypeOrmTaskTicketParticipants },
    { provide: TaskProjectMembers, useClass: NoProjectMembersAdapter },
  ],
})
export class TasksModule implements OnModuleInit {
  constructor(
    private readonly catalog: PermissionCatalog,
    private readonly workflows: WorkflowRegistry,
    private readonly templates: TemplateRegistry,
  ) {}

  onModuleInit(): void {
    this.catalog.register(TASK_PERMISSIONS);
    this.templates.register(TASK_TEMPLATES);
    this.workflows.register({ key: TASK_APPROVAL_KEY, version: TASK_APPROVAL_VERSION, machine: taskApprovalMachine });
  }
}
