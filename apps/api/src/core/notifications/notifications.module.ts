import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailSender, NOTIFICATION_CHANNELS, SmsSender } from './application/notification-channel';
import { NotificationsService } from './application/notifications.service';
import { Notification } from './domain/notification.entity';
import { NotificationRepository, RecipientDirectory } from './domain/notification.repository';
import { EmailChannel, SmsChannel } from './infrastructure/channels';
import { LogSmsSender } from './infrastructure/log-sms.sender';
import { SmtpMailSender } from './infrastructure/smtp-mail.sender';
import {
  TypeOrmNotificationRepository,
  TypeOrmRecipientDirectory,
} from './infrastructure/typeorm-notification.repository';
import { NotificationsController } from './presentation/notifications.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailChannel,
    SmsChannel,
    { provide: NOTIFICATION_CHANNELS, inject: [EmailChannel, SmsChannel], useFactory: (...c: unknown[]) => c },
    { provide: MailSender, useClass: SmtpMailSender },
    { provide: SmsSender, useClass: LogSmsSender },
    { provide: NotificationRepository, useClass: TypeOrmNotificationRepository },
    { provide: RecipientDirectory, useClass: TypeOrmRecipientDirectory },
  ],
  exports: [NotificationsService, MailSender],
})
export class NotificationsModule {}
