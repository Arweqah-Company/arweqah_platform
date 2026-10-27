import { Column, Entity, Index } from 'typeorm';
import type { TemplateContent, TemplateKind } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * What an administrator changed in one message. The default wording is in the code, never copied here: no row (or an empty
 * `content`) means the default is sent. `pending` holds a change that waits for a second person when approval is switched on.
 */
@Entity('message_templates')
@Index('uq_message_template', ['kind', 'key'], { unique: true })
export class MessageTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  kind: TemplateKind;

  @Column({ type: 'varchar', length: 80 })
  key: string;

  @Column({ type: 'jsonb', nullable: true })
  content: TemplateContent | null;

  @Column({ type: 'jsonb', nullable: true })
  pending: TemplateContent | null;

  @Column({ name: 'pending_by', type: 'uuid', nullable: true })
  pendingBy: string | null;

  @Column({ name: 'pending_at', type: 'timestamptz', nullable: true })
  pendingAt: Date | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
