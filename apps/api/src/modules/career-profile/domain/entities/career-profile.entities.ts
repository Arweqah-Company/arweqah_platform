import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { CareerContent, CareerContentStatus } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** The career-path content of one job title: one row per title, `version` grows with every save (FR-111, FR-113). */
@Entity('career_title_content')
@Index('UQ_career_title_content_title', ['titleId'], { unique: true })
export class CareerTitleContent extends BaseEntity {
  @ManyToOne('JobTitle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'title_id', foreignKeyConstraintName: 'FK_career_title_content_title' })
  title?: unknown;

  @Column({ name: 'title_id', type: 'uuid' })
  titleId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: CareerContentStatus;

  @Column({ type: 'jsonb' })
  content: CareerContent;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}

/** A snapshot of the content at each version, so what an employee acknowledged can be shown again (the content itself is replaced on every save). */
@Entity('career_title_content_versions')
@Index('UQ_career_title_content_versions', ['titleId', 'version'], { unique: true })
export class CareerTitleContentVersion extends BaseEntity {
  @ManyToOne('JobTitle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'title_id', foreignKeyConstraintName: 'FK_career_title_content_versions_title' })
  title?: unknown;

  @Column({ name: 'title_id', type: 'uuid' })
  titleId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  content: CareerContent;

  @Column({ name: 'saved_by', type: 'uuid', nullable: true })
  savedBy: string | null;
}

export const CAREER_PROFILE_ENTITIES = [CareerTitleContent, CareerTitleContentVersion];
