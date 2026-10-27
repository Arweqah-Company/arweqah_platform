import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { ExternalServiceError } from '../../../../common/domain/domain-error';
import { MailTransport } from '../../application/mail-transport';
import type { MailReceipt, OutgoingMail } from '../../application/notification-channel';

export interface SesSettings {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  from: string;
}

/** Amazon SES through its API (not the SMTP endpoint). */
export class SesMailTransport extends MailTransport {
  private readonly client: SESv2Client;

  constructor(private readonly settings: SesSettings) {
    super();
    this.client = new SESv2Client({ region: settings.region, credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey } });
  }

  async send(mail: OutgoingMail): Promise<MailReceipt> {
    try {
      const body = { Text: { Data: mail.text, Charset: 'UTF-8' }, ...(mail.html ? { Html: { Data: mail.html, Charset: 'UTF-8' } } : {}) };
      const out = await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.settings.from,
          Destination: { ToAddresses: [mail.to] },
          Content: { Simple: { Subject: { Data: mail.subject, Charset: 'UTF-8' }, Body: body } },
        }),
      );
      return { messageId: out.MessageId ?? null, response: 'Accepted by Amazon SES' };
    } catch (error) {
      throw new ExternalServiceError('Email delivery failed', { cause: (error as Error).message });
    }
  }
}
