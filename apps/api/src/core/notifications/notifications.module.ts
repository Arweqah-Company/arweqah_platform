import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../access/application/permission-catalog';
import { EmailLogService } from './application/email-log.service';
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
import { SmtpMailSender } from './infrastructure/smtp-mail.sender';
import {
  TypeOrmNotificationRepository,
  TypeOrmRecipientDirectory,
} from './infrastructure/typeorm-notification.repository';
import { TypeOrmEmailLogRepository } from './infrastructure/typeorm-email-log.repository';
import { EmailLogController } from './presentation/email-log.controller';
import { NotificationsController } from './presentation/notifications.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, EmailLog])],
  controllers: [NotificationsController, EmailLogController],
  providers: [
    NotificationsService,
    EmailChannel,
    SmsChannel,
    { provide: NOTIFICATION_CHANNELS, inject: [EmailChannel, SmsChannel], useFactory: (...c: unknown[]) => c },
    EmailLogService,
    SmtpMailSender,
    { provide: EmailLogRepository, useClass: TypeOrmEmailLogRepository },
    { provide: MailSender, useClass: LoggedMailSender },
    { provide: SmsSender, useClass: LogSmsSender },
    { provide: NotificationRepository, useClass: TypeOrmNotificationRepository },
    { provide: RecipientDirectory, useClass: TypeOrmRecipientDirectory },
  ],
  exports: [NotificationsService, MailSender],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(NOTIFICATIONS_PERMISSIONS);
  }
}
