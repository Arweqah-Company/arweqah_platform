import { Column, Entity, Index } from 'typeorm';
import type { TourId, TourStatus } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * What an administrator changed in one tour step. The steps and their default wording live in the code; a row exists only for a
 * step that was edited, switched off or reordered, and a null text means «the wording in the code».
 */
@Entity('tour_step_settings')
@Index('uq_tour_step_setting', ['stepKey'], { unique: true })
export class TourStepSetting extends BaseEntity {
  @Column({ name: 'step_key', type: 'varchar', length: 40 })
  stepKey: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'sort_order', type: 'int', nullable: true })
  sortOrder: number | null;

  @Column({ name: 'title_ar', type: 'varchar', length: 80, nullable: true })
  titleAr: string | null;

  @Column({ name: 'title_en', type: 'varchar', length: 80, nullable: true })
  titleEn: string | null;

  @Column({ name: 'body_ar', type: 'varchar', length: 400, nullable: true })
  bodyAr: string | null;

  @Column({ name: 'body_en', type: 'varchar', length: 400, nullable: true })
  bodyEn: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}

/** How far one person got with one tour, and which steps they have been shown (so a later release only offers the new ones). */
@Entity('user_tour_progress')
@Index('uq_user_tour_progress', ['userId', 'tour'], { unique: true })
export class UserTourProgress extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  tour: TourId;

  @Column({ type: 'varchar', length: 20 })
  status: Exclude<TourStatus, 'none'>;

  @Column({ name: 'seen_steps', type: 'text', array: true, default: () => "'{}'" })
  seenSteps: string[];
}

export const TOUR_ENTITIES = [TourStepSetting, UserTourProgress];
