import { Column, Entity, Index } from 'typeorm';
import type { TemplateKind } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** Settings of one tab of message templates: today only whether a change needs a second person's approval. */
@Entity('template_settings')
@Index('uq_template_setting_kind', ['kind'], { unique: true })
export class TemplateSetting extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  kind: TemplateKind;

  @Column({ name: 'require_approval', type: 'boolean', default: false })
  requireApproval: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
