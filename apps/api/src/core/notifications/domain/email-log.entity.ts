import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { EmailPurpose, EmailStatus } from '@arweqah-platform/shared';

/** One row per e-mail the platform tried to send. The body is never stored: it can hold one-time links. */
@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'to_email', type: 'varchar', length: 254 })
  toEmail: string;

  @Column({ type: 'varchar', length: 300 })
  subject: string;

  @Column({ type: 'varchar', length: 30, default: 'other' })
  purpose: EmailPurpose;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: EmailStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'message_id', type: 'varchar', length: 300, nullable: true })
  messageId: string | null;

  @Column({ name: 'provider_response', type: 'text', nullable: true })
  providerResponse: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}
