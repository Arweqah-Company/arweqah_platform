import { Injectable, Logger } from '@nestjs/common';
import { EmailLogRepository } from '../domain/email-log.repository';
import { MailSender, type MailReceipt, type OutgoingMail } from '../application/notification-channel';
import { SmtpMailSender } from './smtp-mail.sender';

/** Decorator: every e-mail is recorded as pending, then sent or failed, so delivery can be followed. */
@Injectable()
export class LoggedMailSender extends MailSender {
  private readonly logger = new Logger('Mail');

  constructor(
    private readonly smtp: SmtpMailSender,
    private readonly logs: EmailLogRepository,
  ) {
    super();
  }

  async send(mail: OutgoingMail): Promise<MailReceipt> {
    const id = await this.logs.start({ to: mail.to, subject: mail.subject, purpose: mail.purpose ?? 'other' });
    try {
      const receipt = await this.smtp.send(mail);
      await this.logs.markSent(id, receipt);
      return receipt;
    } catch (error) {
      const cause = (error as { details?: { cause?: string } }).details?.cause ?? (error as Error).message;
      this.logger.error(`E-mail to ${mail.to} failed: ${cause}`);
      await this.logs.markFailed(id, cause);
      throw error;
    }
  }
}
