import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { LessThanOrEqual, Repository } from 'typeorm';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { AppConfig } from '../../../config/app-config.service';
import { JobScheduler, Outbox, type ScheduleOptions } from '../application/outbox';
import { ScheduledJob } from '../domain/scheduled-job.entity';

const BATCH = 100;

@Injectable()
export class TypeOrmJobScheduler extends JobScheduler {
  constructor(@InjectRepository(ScheduledJob) private readonly repo: Repository<ScheduledJob>) {
    super();
  }

  async schedule(topic: string, payload: Record<string, unknown>, options: ScheduleOptions): Promise<void> {
    const m = managerOf(options.tx, this.repo.manager);
    if (options.dedupeKey) await this.cancel(options.dedupeKey, options.tx);
    await m.insert(ScheduledJob, { topic, payload: payload as never, runAt: options.runAt, dedupeKey: options.dedupeKey ?? null });
  }

  async cancel(dedupeKey: string, tx?: TransactionContext): Promise<void> {
    await managerOf(tx, this.repo.manager).update(
      ScheduledJob,
      { dedupeKey, status: 'pending' },
      { status: 'cancelled' },
    );
  }
}

/** Moves due jobs into the outbox, which publishes them to RabbitMQ. */
@Injectable()
export class ScheduledJobRelay {
  constructor(
    @InjectRepository(ScheduledJob) private readonly repo: Repository<ScheduledJob>,
    private readonly outbox: Outbox,
    private readonly config: AppConfig,
  ) {}

  @Interval(5000)
  async tick(): Promise<void> {
    if (!this.config.isTest) await this.releaseDue(new Date());
  }

  async releaseDue(now: Date): Promise<number> {
    return this.repo.manager.transaction(async (m) => {
      const due = await m.getRepository(ScheduledJob).find({
        where: { status: 'pending', runAt: LessThanOrEqual(now) },
        order: { runAt: 'ASC' },
        take: BATCH,
        lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
      });
      for (const job of due) {
        await m.insert('outbox_messages', { topic: job.topic, payload: { ...job.payload, jobId: job.id } });
        await m.update(ScheduledJob, job.id, { status: 'done', attempts: job.attempts + 1 });
      }
      return due.length;
    });
  }
}
