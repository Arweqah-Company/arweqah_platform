import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { CycleDate, TemplateSnapshot } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** An evaluation cycle: one per fiscal year (FR-118). `status` is the stage of the machine `performance.cycle`; the snapshot freezes the templates when it opens. */
@Entity('performance_cycles')
export class PerformanceCycle extends BaseEntity {
  @Index('UQ_performance_cycles_year', { unique: true })
  @Column({ name: 'fiscal_year', type: 'int' })
  fiscalYear: number;

  @Index('IDX_performance_cycles_status')
  @Column({ type: 'varchar', length: 8 })
  status: string;

  @Column({ name: 'opened_by', type: 'uuid' })
  openedBy: string;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  dates: CycleDate[];

  @Column({ name: 'template_snapshot', type: 'jsonb' })
  templateSnapshot: TemplateSnapshot;
}

/** An item HR offers for the extra component (an internal initiative or a contribution to growth) with its points. `cycle_id` is null until the next cycle opens and takes it. */
@Entity('performance_catalog_items')
export class PerformanceCatalogItem extends BaseEntity {
  @ManyToOne('PerformanceCycle', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'cycle_id', foreignKeyConstraintName: 'FK_performance_catalog_items_cycle' })
  cycle?: unknown;

  @Index('IDX_performance_catalog_items_cycle')
  @Column({ name: 'cycle_id', type: 'uuid', nullable: true })
  cycleId: string | null;

  /** `init` (internal initiative) or `growth` (contribution to growth). */
  @Column({ type: 'varchar', length: 8 })
  kind: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'int' })
  points: number;
}

export const PERFORMANCE_CYCLE_ENTITIES = [PerformanceCycle, PerformanceCatalogItem];
