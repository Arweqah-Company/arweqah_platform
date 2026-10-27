import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { EmailPurpose, NotificationChannel as ChannelName, NotificationDto, NotificationsQuery, Paginated } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { AppConfig } from '../../../config/app-config.service';
import { MessageBus } from '../../messaging/application/message-bus';
import { IdempotencyGuard, Outbox } from '../../messaging/application/outbox';
import type { Notification } from '../domain/notification.entity';
import { NotificationRepository, RecipientDirectory } from '../domain/notification.repository';
import { NOTIFICATION_CHANNELS, NotificationChannel } from './notification-channel';

export const NOTIFICATION_DISPATCH = 'notifications.dispatch';

export interface NotifyCommand {
  userIds: string[];
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  link?: string;
  /** In-app is always created; these are sent in addition, in the background. */
  channels?: Exclude<ChannelName, 'in_app'>[];
  /** The category the e-mail is filed under in the e-mail log; a general notification when not given. */
  purpose?: EmailPurpose;
  tx?: TransactionContext;
}

interface DispatchPayload {
  notificationId: string;
  userId: string;
  channel: Exclude<ChannelName, 'in_app'>;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  link: string | null;
  purpose?: EmailPurpose;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationRepository,
    private readonly directory: RecipientDirectory,
    private readonly outbox: Outbox,
    private readonly bus: MessageBus,
    private readonly idempotency: IdempotencyGuard,
    private readonly config: AppConfig,
    @Inject(NOTIFICATION_CHANNELS) private readonly channels: NotificationChannel[],
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<DispatchPayload>('notifications', NOTIFICATION_DISPATCH, async (msg) => {
      await this.idempotency.once('notifications', msg.id, () => this.dispatch(msg.payload));
    });
  }

  async notify(cmd: NotifyCommand): Promise<void> {
    const rows = await this.repo.insertMany(
      cmd.userIds.map((userId) => ({
        userId,
        titleAr: cmd.titleAr,
        titleEn: cmd.titleEn,
        bodyAr: cmd.bodyAr,
        bodyEn: cmd.bodyEn,
        link: cmd.link ?? null,
      })),
      cmd.tx,
    );
    for (const row of rows) {
      for (const channel of cmd.channels ?? []) {
        const payload: DispatchPayload = { notificationId: row.id, channel, purpose: cmd.purpose, ...pickContent(row) };
        await this.outbox.enqueue(NOTIFICATION_DISPATCH, { ...payload }, cmd.tx);
      }
    }
  }

  async list(userId: string, query: NotificationsQuery): Promise<Paginated<NotificationDto>> {
    const page = await this.repo.listFor(userId, query);
    return { ...page, items: page.items.map(toDto) };
  }

  unreadCount(userId: string): Promise<number> {
    return this.repo.unreadCount(userId);
  }

  markRead(userId: string, ids: string[] | 'all'): Promise<number> {
    return this.repo.markRead(userId, ids);
  }

  private async dispatch(payload: DispatchPayload): Promise<void> {
    const channel = this.channels.find((c) => c.name === payload.channel);
    const recipient = await this.directory.find(payload.userId);
    if (!channel || !recipient) {
      this.logger.warn(`Skipping ${payload.channel} notification: channel or recipient missing`);
      return;
    }
    const ar = recipient.locale === 'ar';
    const link = payload.link ? new URL(payload.link, this.config.get('APP_URL')).toString() : null;
    await channel.send(recipient, {
      title: ar ? payload.titleAr : payload.titleEn,
      body: ar ? payload.bodyAr : payload.bodyEn,
      link,
      purpose: payload.purpose,
    });
  }
}

function pickContent(row: Notification) {
  return {
    userId: row.userId,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    bodyAr: row.bodyAr,
    bodyEn: row.bodyEn,
    link: row.link,
  };
}

function toDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    titleAr: n.titleAr,
    titleEn: n.titleEn,
    bodyAr: n.bodyAr,
    bodyEn: n.bodyEn,
    link: n.link,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
