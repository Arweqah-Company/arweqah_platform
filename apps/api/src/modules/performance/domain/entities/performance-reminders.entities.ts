import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * An automatic reminder of the evaluation cycle (plan §3.7ج): who it is for (`kind`), when (`days`: the days before a date, or the one number of «every N days»),
 * and the words HR wrote for it. The English words are optional: the Arabic ones are sent when they are empty. `PerformanceReminderSendService` sends them each morning.
 */
@Entity('performance_reminders')
export class PerformanceReminder extends BaseEntity {
  @Column({ type: 'varchar', length: 8 })
  kind: string;

  @Column({ name: 'is_on', type: 'boolean', default: true })
  isOn: boolean;

  @Column({ type: 'jsonb' })
  days: number[];

  @Column({ name: 'title_ar', type: 'varchar', length: 120 })
  titleAr: string;

  @Column({ name: 'title_en', type: 'varchar', length: 120, default: '' })
  titleEn: string;

  @Column({ name: 'body_ar', type: 'varchar', length: 600 })
  bodyAr: string;

  @Column({ name: 'body_en', type: 'varchar', length: 600, default: '' })
  bodyEn: string;

  /** The day (Riyadh) the reminder was last sent: it is never sent twice in a day, and «every N days» counts from it. */
  @Column({ name: 'last_sent_on', type: 'date', nullable: true })
  lastSentOn: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}

export const PERFORMANCE_REMINDER_ENTITIES = [PerformanceReminder];
