import { MailSender, type MailReceipt, type OutgoingMail } from '../../src/core/notifications/application/notification-channel';

/** Captures emails instead of sending them; CI never talks to a real mail server. */
export class FakeMailSender extends MailSender {
  readonly sent: OutgoingMail[] = [];

  async send(mail: OutgoingMail): Promise<MailReceipt> {
    this.sent.push(mail);
    return { messageId: null, response: null };
  }
}
