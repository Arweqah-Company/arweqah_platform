import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../access/application/permission-catalog';
import { MessageTemplatesService } from './application/services/message-templates.service';
import { TemplateRegistry } from './application/services/template-registry';
import { TemplateRenderer } from './application/services/template-renderer';
import { MessageTemplateRepository } from './domain/contracts/message-template.repository';
import { MessageTemplate } from './domain/entities/message-template.entity';
import { TemplateSetting } from './domain/entities/template-setting.entity';
import { TEMPLATES_PERMISSIONS } from './domain/permissions/templates.permissions';
import { TypeOrmMessageTemplateRepository } from './infrastructure/repositories/typeorm-message-template.repository';
import { EmailTemplateApprovalController, EmailTemplatesController, NotificationTemplateApprovalController, NotificationTemplatesController } from './presentation/controllers/template-controllers';

/** The wording of every e-mail and notification, editable from the dashboard. Global: the senders ask it to render, and every module registers its own templates. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MessageTemplate, TemplateSetting])],
  controllers: [EmailTemplatesController, EmailTemplateApprovalController, NotificationTemplatesController, NotificationTemplateApprovalController] as never[],
  providers: [MessageTemplatesService, TemplateRegistry, TemplateRenderer, { provide: MessageTemplateRepository, useClass: TypeOrmMessageTemplateRepository }],
  exports: [TemplateRegistry, TemplateRenderer, MessageTemplatesService],
})
export class TemplatesModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(TEMPLATES_PERMISSIONS);
  }
}
