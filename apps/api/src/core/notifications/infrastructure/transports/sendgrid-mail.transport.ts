import { MailService } from '@sendgrid/mail';
import { ExternalServiceError } from '../../../../common/domain/domain-error';
import { MailTransport } from '../../application/mail-transport';
import type { MailReceipt, OutgoingMail } from '../../application/notification-channel';
import { parseSender } from '../../application/sender-address';

export interface SendGridSettings {
  apiKey: string;
  from: string;
}

const htmlOf = (mail: OutgoingMail): { html?: string } => (mail.html ? { html: mail.html } : {});

const problemOf = (error: unknown): string => (error as { response?: { body?: { errors?: { message?: string }[] } } }).response?.body?.errors?.[0]?.message ?? (error as Error).message;

export class SendGridMailTransport extends MailTransport {
  private readonly client = new MailService();

  constructor(private readonly settings: SendGridSettings) {
    super();
    this.client.setApiKey(settings.apiKey);
  }

  async send(mail: OutgoingMail): Promise<MailReceipt> {
    const { name, email } = parseSender(this.settings.from);
    try {
      const [response] = await this.client.send({ to: mail.to, from: name ? { email, name } : email, subject: mail.subject, text: mail.text, ...htmlOf(mail) });
      return { messageId: String(response.headers['x-message-id'] ?? '') || null, response: `SendGrid answered ${response.statusCode}` };
    } catch (error) {
      throw new ExternalServiceError('Email delivery failed', { cause: problemOf(error) });
    }
  }
}
