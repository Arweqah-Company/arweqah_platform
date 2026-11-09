import { Column, Entity, Index } from 'typeorm';
import type { StageTemplate } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** The template of one development stage, as the evaluation file gave it (FR-118). One row per stage; a new upload of the stage replaces it. */
@Entity('performance_templates')
export class PerformanceTemplate extends BaseEntity {
  @Index('UQ_performance_templates_stage', { unique: true })
  @Column({ name: 'stage_no', type: 'int' })
  stageNo: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** The whole stage template: weights, extra components, cap, criteria, behaviours. */
  @Column({ type: 'jsonb' })
  template: StageTemplate;

  /** Grows by one with every upload of the stage. */
  @Column({ name: 'source_version', type: 'int', default: 1 })
  sourceVersion: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}

/** A setting shared by every stage: the grade scale (`grade_scale`) and the fiscal-year card (`fiscal_card`). */
@Entity('performance_settings')
export class PerformanceSetting extends BaseEntity {
  @Index('UQ_performance_settings_key', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}

export const PERFORMANCE_TEMPLATE_ENTITIES = [PerformanceTemplate, PerformanceSetting];
