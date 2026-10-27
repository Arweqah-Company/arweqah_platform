import { Injectable } from '@nestjs/common';
import type { Recipient } from '../domain/notification.repository';
import { MailSender, NotificationChannel, SmsSender, type OutgoingMessage } from '../application/notification-channel';

@Injectable()
export class EmailChannel extends NotificationChannel {
  readonly name = 'email' as const;

  constructor(private readonly mail: MailSender) {
    super();
  }

  async send(recipient: Recipient, message: OutgoingMessage): Promise<void> {
    const text = message.link ? `${message.body}\n\n${message.link}` : message.body;
    await this.mail.send({ purpose: message.purpose ?? 'notification', to: recipient.email, subject: message.title, text });
  }
}

@Injectable()
export class SmsChannel extends NotificationChannel {
  readonly name = 'sms' as const;

  constructor(private readonly sms: SmsSender) {
    super();
  }

  async send(recipient: Recipient, message: OutgoingMessage): Promise<void> {
    if (!recipient.phone) return;
    await this.sms.send({ to: recipient.phone, text: `${message.title}: ${message.body}` });
  }
}
