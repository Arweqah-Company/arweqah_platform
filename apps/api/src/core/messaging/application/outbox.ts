import type { TransactionContext } from '../../../common/application/transaction-runner';

export abstract class Outbox {
  /** Pass the caller's transaction so the event commits (or rolls back) with the change. */
  abstract enqueue(topic: string, payload: Record<string, unknown>, tx?: TransactionContext): Promise<void>;
}

export interface ScheduleOptions {
  runAt: Date;
  /** A pending job with the same key is replaced (e.g. one escalation per request). */
  dedupeKey?: string;
  tx?: TransactionContext;
}

export abstract class JobScheduler {
  abstract schedule(topic: string, payload: Record<string, unknown>, options: ScheduleOptions): Promise<void>;
  abstract cancel(dedupeKey: string, tx?: TransactionContext): Promise<void>;
}

export abstract class IdempotencyGuard {
  /** Runs `work` only the first time this consumer sees the message. */
  abstract once(consumer: string, messageId: string, work: () => Promise<void>): Promise<boolean>;
}
