import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageBus } from '../../../../core/messaging/application/message-bus';
import { IdempotencyGuard } from '../../../../core/messaging/application/outbox';
import { NOTICE_TOPICS } from '../../application/messages/notice.messages';
import { NoticeDeliveryService, type BatchJob } from '../../application/services/notice-delivery.service';

const CONSUMER = 'notices';

/** The two durable messages of a notice: the publish day came, and one delivery batch is due. A message that arrives twice does its work once. */
@Injectable()
export class NoticeDeliveryConsumer implements OnModuleInit {
  constructor(
    private readonly bus: MessageBus,
    private readonly idempotency: IdempotencyGuard,
    private readonly delivery: NoticeDeliveryService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<{ noticeId: string }>(CONSUMER, NOTICE_TOPICS.publishDue, async (msg) => {
      await this.idempotency.once(CONSUMER, msg.id, async () => void (await this.delivery.publishDue(msg.payload.noticeId)));
    });
    await this.bus.subscribe<BatchJob>(CONSUMER, NOTICE_TOPICS.deliverBatch, async (msg) => {
      await this.idempotency.once(CONSUMER, msg.id, () => this.delivery.deliverBatch(msg.payload));
    });
  }
}
