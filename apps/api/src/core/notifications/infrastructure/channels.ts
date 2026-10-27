import { Injectable } from '@nestjs/common';
import type { Recipient } from '../domain/notification.repository';
import { TemplateRenderer } from '../../templates/application/services/template-renderer';
import { NOTIFICATION_EMAIL_TEMPLATE } from '../application/email-templates';
import { MailSender, NotificationChannel, SmsSender, type OutgoingMessage } from '../application/notification-channel';

@Injectable()
export class EmailChannel extends NotificationChannel {
  readonly name = 'email' as const;

  constructor(
    private readonly mail: MailSender,
    private readonly templates: TemplateRenderer,
  ) {
    super();
  }

  /** The notification inside the e-mail frame the administrator can restyle; the notice's own wording is already in `message`. */
  async send(recipient: Recipient, message: OutgoingMessage): Promise<void> {
    const mail = await this.templates.renderEmail(NOTIFICATION_EMAIL_TEMPLATE, recipient.locale, { name: recipient.name, title: message.title, body: message.body, link: message.link ?? '' });
    await this.mail.send({ purpose: message.purpose ?? 'notification', to: recipient.email, subject: mail.subject, text: mail.text, html: mail.html });
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
