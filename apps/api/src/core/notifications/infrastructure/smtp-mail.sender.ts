import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { ExternalServiceError } from '../../../common/domain/domain-error';
import { AppConfig } from '../../../config/app-config.service';
import { MailSender } from '../application/notification-channel';

/** SMTP adapter: Mailpit locally, Amazon SES SMTP endpoint in production. */
@Injectable()
export class SmtpMailSender extends MailSender {
  private readonly transport: Transporter;

  constructor(private readonly config: AppConfig) {
    super();
    const user = config.get('SMTP_USER');
    this.transport = createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get('SMTP_PORT'),
      secure: config.get('SMTP_SECURE'),
      auth: user ? { user, pass: config.get('SMTP_PASSWORD') } : undefined,
      connectionTimeout: 10_000,
    });
  }

  async send(mail: { to: string; subject: string; text: string }): Promise<void> {
    try {
      await this.transport.sendMail({ from: this.config.get('MAIL_FROM'), ...mail });
    } catch (error) {
      throw new ExternalServiceError('Email delivery failed', { cause: (error as Error).message });
    }
  }
}
