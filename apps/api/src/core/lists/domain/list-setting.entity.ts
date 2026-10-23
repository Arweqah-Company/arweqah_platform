import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** What an administrator hid in one list (one row per customized list, the same for everyone). */
@Entity('list_settings')
export class ListSetting {
  @PrimaryColumn({ name: 'list_key', type: 'varchar', length: 40 })
  listKey: string;

  @Column({ name: 'hidden_columns', type: 'jsonb', default: () => `'[]'` })
  hiddenColumns: string[];

  @Column({ name: 'hidden_filters', type: 'jsonb', default: () => `'[]'` })
  hiddenFilters: string[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
