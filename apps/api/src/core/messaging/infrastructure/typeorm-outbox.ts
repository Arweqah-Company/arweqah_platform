import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { IsNull, Repository } from 'typeorm';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { AppConfig } from '../../../config/app-config.service';
import { MessageBus } from '../application/message-bus';
import { IdempotencyGuard, Outbox } from '../application/outbox';
import { OutboxMessage } from '../domain/outbox-message.entity';
import { ProcessedMessage } from '../domain/processed-message.entity';

const BATCH = 50;

@Injectable()
export class TypeOrmOutbox extends Outbox {
  constructor(@InjectRepository(OutboxMessage) private readonly repo: Repository<OutboxMessage>) {
    super();
  }

  async enqueue(topic: string, payload: Record<string, unknown>, tx?: TransactionContext): Promise<void> {
    await managerOf(tx, this.repo.manager).insert(OutboxMessage, { topic, payload: payload as never });
  }
}

/** Publishes committed outbox rows. SKIP LOCKED lets several API instances run it safely. */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);

  constructor(
    @InjectRepository(OutboxMessage) private readonly repo: Repository<OutboxMessage>,
    private readonly bus: MessageBus,
    private readonly config: AppConfig,
  ) {}

  @Interval(1000)
  async tick(): Promise<void> {
    if (!this.config.isTest) await this.flush();
  }

  /** Publishes pending rows; returns how many were sent. Tests call it directly. */
  async flush(): Promise<number> {
    return this.repo.manager.transaction(async (m) => {
      const rows = await m.getRepository(OutboxMessage).find({
        where: { publishedAt: IsNull() },
        order: { createdAt: 'ASC' },
        take: BATCH,
        lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
      });
      let sent = 0;
      for (const row of rows) {
        try {
          await this.bus.publish({ id: row.id, topic: row.topic, payload: row.payload });
          await m.update(OutboxMessage, row.id, { publishedAt: new Date(), attempts: row.attempts + 1 });
          sent++;
        } catch (error) {
          this.logger.warn(`Outbox publish failed for ${row.topic}: ${(error as Error).message}`);
          await m.update(OutboxMessage, row.id, { attempts: row.attempts + 1, lastError: String(error) });
        }
      }
      return sent;
    });
  }
}

@Injectable()
export class TypeOrmIdempotencyGuard extends IdempotencyGuard {
  constructor(@InjectRepository(ProcessedMessage) private readonly repo: Repository<ProcessedMessage>) {
    super();
  }

  async once(consumer: string, messageId: string, work: () => Promise<void>): Promise<boolean> {
    return this.repo.manager.transaction(async (m) => {
      const inserted = await m
        .createQueryBuilder()
        .insert()
        .into(ProcessedMessage)
        .values({ consumer, messageId })
        .orIgnore()
        .execute();
      if ((inserted.raw as unknown[]).length === 0) return false;
      await work();
      return true;
    });
  }
}
