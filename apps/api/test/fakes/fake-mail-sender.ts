import { MailSender } from '../../src/core/notifications/application/notification-channel';

/** Captures emails instead of sending them; CI never talks to a real mail server. */
export class FakeMailSender extends MailSender {
  readonly sent: { to: string; subject: string; text: string }[] = [];

  async send(mail: { to: string; subject: string; text: string }): Promise<void> {
    this.sent.push(mail);
  }
}
