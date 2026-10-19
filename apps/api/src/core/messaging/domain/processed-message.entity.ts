import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Makes consumers idempotent: a (consumer, message) pair is handled once. */
@Entity('processed_messages')
export class ProcessedMessage {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  consumer: string;

  @PrimaryColumn({ name: 'message_id', type: 'varchar', length: 100 })
  messageId: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt: Date;
}
