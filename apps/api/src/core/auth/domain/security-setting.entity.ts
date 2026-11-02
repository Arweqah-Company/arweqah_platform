import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** One security number the administrator set (a key of `SECURITY_SETTINGS`); a key with no row has its default. */
@Entity('security_settings')
export class SecuritySetting {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  key: string;

  @Column({ type: 'int' })
  value: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
