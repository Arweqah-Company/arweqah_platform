import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../access/application/permission-catalog';
import { TemplateRegistry } from '../templates/application/services/template-registry';
import { EMAIL_TEMPLATES } from './application/email-templates';
import { TemplateTestMailService } from './application/template-test-mail.service';
import { EmailLogService } from './application/email-log.service';
import { EmailProbe } from './application/email-probe';
import { MailTransport, MailTransportFactory } from './application/mail-transport';
import { MailSender, NOTIFICATION_CHANNELS, SmsSender } from './application/notification-channel';
import { NotificationsService } from './application/notifications.service';
import { EmailLog } from './domain/email-log.entity';
import { EmailLogRepository } from './domain/email-log.repository';
import { NOTIFICATIONS_PERMISSIONS } from './domain/notifications.permissions';
import { Notification } from './domain/notification.entity';
import { NotificationRepository, RecipientDirectory } from './domain/notification.repository';
import { EmailChannel, SmsChannel } from './infrastructure/channels';
import { LogSmsSender } from './infrastructure/log-sms.sender';
import { LoggedMailSender } from './infrastructure/logged-mail.sender';
import { ActiveMailTransport } from './infrastructure/transports/active-mail.transport';
import { ProviderMailTransportFactory } from './infrastructure/transports/provider-mail-transport.factory';
import {
  TypeOrmNotificationRepository,
  TypeOrmRecipientDirectory,
} from './infrastructure/typeorm-notification.repository';
import { TypeOrmEmailLogRepository } from './infrastructure/typeorm-email-log.repository';
import { EmailLogController } from './presentation/email-log.controller';
import { TemplateTestController } from './presentation/template-test.controller';
import { NotificationsController } from './presentation/notifications.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, EmailLog])],
  controllers: [NotificationsController, EmailLogController, TemplateTestController],
  providers: [
    NotificationsService,
    EmailChannel,
    SmsChannel,
    { provide: NOTIFICATION_CHANNELS, inject: [EmailChannel, SmsChannel], useFactory: (...c: unknown[]) => c },
    EmailLogService,
    EmailProbe,
    TemplateTestMailService,
    { provide: MailTransportFactory, useClass: ProviderMailTransportFactory },
    { provide: MailTransport, useClass: ActiveMailTransport },
    { provide: EmailLogRepository, useClass: TypeOrmEmailLogRepository },
    { provide: MailSender, useClass: LoggedMailSender },
    { provide: SmsSender, useClass: LogSmsSender },
    { provide: NotificationRepository, useClass: TypeOrmNotificationRepository },
    { provide: RecipientDirectory, useClass: TypeOrmRecipientDirectory },
  ],
  exports: [NotificationsService, MailSender],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private readonly catalog: PermissionCatalog,
    private readonly templates: TemplateRegistry,
  ) {}

  onModuleInit(): void {
    this.catalog.register(NOTIFICATIONS_PERMISSIONS);
    this.templates.register(EMAIL_TEMPLATES);
  }
}
