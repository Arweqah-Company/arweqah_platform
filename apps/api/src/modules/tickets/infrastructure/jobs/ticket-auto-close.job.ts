import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfig } from '../../../../config/app-config.service';
import { MessageBus } from '../../../../core/messaging/application/message-bus';
import { IdempotencyGuard } from '../../../../core/messaging/application/outbox';
import { TicketLifecycleService } from '../../application/services/ticket-lifecycle.service';
import { TICKET_TOPICS } from '../../application/messages/ticket.messages';

const CONSUMER = 'tickets';

/** The automatic closing (a durable scheduled job per closing request) and the daily notice of stale tickets. */
@Injectable()
export class TicketJobs implements OnModuleInit {
  constructor(
    private readonly bus: MessageBus,
    private readonly idempotency: IdempotencyGuard,
    private readonly lifecycle: TicketLifecycleService,
    private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<{ ticketId: string; closeRequestedAt: string }>(CONSUMER, TICKET_TOPICS.autoClose, async (msg) => {
      await this.idempotency.once(CONSUMER, msg.id, () => this.lifecycle.autoClose(msg.payload.ticketId, msg.payload.closeRequestedAt));
    });
  }

  /** Every morning (06:00 Riyadh time); skipped in tests, which call `announceStale` themselves. */
  @Cron('0 6 * * *', { timeZone: 'Asia/Riyadh' })
  async dailyStale(): Promise<void> {
    if (!this.config.isTest) await this.lifecycle.announceStale();
  }
}
