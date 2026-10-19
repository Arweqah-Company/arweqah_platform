import type { NotificationChannel as ChannelName } from '@arweqah-platform/shared';
import type { Recipient } from '../domain/notification.repository';

export interface OutgoingMessage {
  title: string;
  body: string;
  link: string | null;
}

/** Strategy: one class per delivery channel (email, SMS…). Adding a channel = adding a class. */
export abstract class NotificationChannel {
  abstract readonly name: Exclude<ChannelName, 'in_app'>;
  abstract send(recipient: Recipient, message: OutgoingMessage): Promise<void>;
}

/** DI token for the list of external channels. */
export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');

export abstract class MailSender {
  abstract send(mail: { to: string; subject: string; text: string }): Promise<void>;
}

export abstract class SmsSender {
  abstract send(sms: { to: string; text: string }): Promise<void>;
}
