import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ScheduledJobStatus = 'pending' | 'done' | 'cancelled' | 'failed';

/**
 * Delayed work (SLA escalations, reminders, recurring syncs). RabbitMQ has no
 * durable delayed delivery, so due jobs are stored here and published when due.
 */
@Entity('scheduled_jobs')
@Index(['status', 'runAt'])
export class ScheduledJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  topic: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'run_at', type: 'timestamptz' })
  runAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ScheduledJobStatus;

  /** Re-scheduling with the same key replaces the pending job. */
  @Index({ unique: true, where: "status = 'pending' AND dedupe_key IS NOT NULL" })
  @Column({ name: 'dedupe_key', type: 'varchar', length: 200, nullable: true })
  dedupeKey: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
