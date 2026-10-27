import { createTransport, type Transporter } from 'nodemailer';
import { ExternalServiceError } from '../../../../common/domain/domain-error';
import { MailTransport } from '../../application/mail-transport';
import type { MailReceipt, OutgoingMail } from '../../application/notification-channel';

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

/** Plain SMTP: Mailpit locally, any mail server (or the Amazon SES SMTP endpoint) in production. */
export class SmtpMailTransport extends MailTransport {
  private readonly transport: Transporter;

  constructor(private readonly settings: SmtpSettings) {
    super();
    this.transport = createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user ? { user: settings.user, pass: settings.password } : undefined,
      connectionTimeout: 10_000,
    });
  }

  async send({ purpose: _purpose, ...mail }: OutgoingMail): Promise<MailReceipt> {
    try {
      const info = await this.transport.sendMail({ from: this.settings.from, ...mail });
      return { messageId: info.messageId ?? null, response: info.response ?? null };
    } catch (error) {
      throw new ExternalServiceError('Email delivery failed', { cause: (error as Error).message });
    }
  }
}
