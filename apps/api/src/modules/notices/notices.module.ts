import { Module, OnModuleInit } from '@nestjs/common';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { TemplateRegistry } from '../../core/templates/application/services/template-registry';
import { WorkflowRegistry } from '../../core/workflow/application/workflow-definition';
import { NOTICE_TEMPLATES } from './application/messages/notice-templates';
import { NoticeAccessPolicy } from './application/policies/notice-access.policy';
import { NoticeApprovalService } from './application/services/notice-approval.service';
import { NoticeAudienceService } from './application/services/notice-audience.service';
import { NoticeAuditor } from './application/services/notice-auditor.service';
import { NoticeChannelAdminService } from './application/services/notice-channel-admin.service';
import { NoticeChannelService } from './application/services/notice-channel.service';
import { NoticeContentService } from './application/services/notice-content.service';
import { NoticeDeliveryService } from './application/services/notice-delivery.service';
import { NoticeLifecycleService } from './application/services/notice-lifecycle.service';
import { NoticeMineService } from './application/services/notice-mine.service';
import { NoticeNotifier } from './application/services/notice-notifier.service';
import { NoticeQueryService } from './application/services/notice-query.service';
import { NoticeReportService } from './application/services/notice-report.service';
import { NoticeRevisionService } from './application/services/notice-revision.service';
import { NoticeWorkflow } from './application/services/notice-workflow.service';
import { NoticeService } from './application/services/notice.service';
import { NoticeTransformer } from './application/transformers/notice.transformer';
import { NoticeChannelRepository } from './domain/contracts/notice-channel.repository';
import { NoticeDeliveryRepository } from './domain/contracts/notice-delivery.repository';
import { NoticeDirectory } from './domain/contracts/notice-directory.port';
import { NoticeQueryRepository } from './domain/contracts/notice-query.repository';
import { NoticeRepository } from './domain/contracts/notice.repository';
import { NOTICE_PERMISSIONS } from './domain/permissions/notices.permissions';
import { NOTICE_WORKFLOW_KEY, NOTICE_WORKFLOW_VERSION, noticeMachine } from './domain/rules/notice-machine';
import { NoticeCatchUpJob } from './infrastructure/jobs/notice-catch-up.job';
import { NoticeDeliveryConsumer } from './infrastructure/jobs/notice-delivery.consumer';
import { TypeOrmNoticeChannelRepository } from './infrastructure/repositories/typeorm-notice-channel.repository';
import { TypeOrmNoticeDeliveryRepository } from './infrastructure/repositories/typeorm-notice-delivery.repository';
import { TypeOrmNoticeDirectory } from './infrastructure/repositories/typeorm-notice-directory';
import { TypeOrmNoticeQueryRepository } from './infrastructure/repositories/typeorm-notice-query.repository';
import { TypeOrmNoticeRepository } from './infrastructure/repositories/typeorm-notice.repository';
import { NoticeApprovalsController } from './presentation/controllers/notice-approvals.controller';
import { NoticeChannelsController } from './presentation/controllers/notice-channels.controller';
import { NoticeMineController } from './presentation/controllers/notice-mine.controller';
import { NoticesController } from './presentation/controllers/notices.controller';

/**
 * Circulars and policies: written by the writers of the channels of units, approved by the head of the writer's unit, delivered to an audience in batches on the publish day,
 * acknowledged by the employees. The routes with a fixed path are registered before `notices/:id`.
 */
@Module({
  controllers: [NoticeMineController, NoticeChannelsController, NoticeApprovalsController, NoticesController],
  providers: [
    NoticeService,
    NoticeApprovalService,
    NoticeRevisionService,
    NoticeLifecycleService,
    NoticeDeliveryService,
    NoticeAudienceService,
    NoticeContentService,
    NoticeQueryService,
    NoticeMineService,
    NoticeReportService,
    NoticeChannelService,
    NoticeChannelAdminService,
    NoticeWorkflow,
    NoticeNotifier,
    NoticeAuditor,
    NoticeAccessPolicy,
    NoticeTransformer,
    NoticeDeliveryConsumer,
    NoticeCatchUpJob,
    { provide: NoticeRepository, useClass: TypeOrmNoticeRepository },
    { provide: NoticeQueryRepository, useClass: TypeOrmNoticeQueryRepository },
    { provide: NoticeDeliveryRepository, useClass: TypeOrmNoticeDeliveryRepository },
    { provide: NoticeChannelRepository, useClass: TypeOrmNoticeChannelRepository },
    { provide: NoticeDirectory, useClass: TypeOrmNoticeDirectory },
  ],
  exports: [NoticeChannelService, NoticeDeliveryService],
})
export class NoticesModule implements OnModuleInit {
  constructor(
    private readonly catalog: PermissionCatalog,
    private readonly templates: TemplateRegistry,
    private readonly workflows: WorkflowRegistry,
  ) {}

  onModuleInit(): void {
    this.catalog.register(NOTICE_PERMISSIONS);
    this.templates.register(NOTICE_TEMPLATES);
    this.workflows.register({ key: NOTICE_WORKFLOW_KEY, version: NOTICE_WORKFLOW_VERSION, machine: noticeMachine });
  }
}
