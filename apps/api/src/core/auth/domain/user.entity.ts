import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BusinessRuleError } from '../../../common/domain/domain-error';

/**
 * The `users` table is shared with Better Auth, which writes the identity columns.
 * This module owns the business columns (is_active, phone, locale, theme).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 2, default: 'ar' })
  locale: 'ar' | 'en';

  /** Interface theme: light, dark, or follow the device. */
  @Column({ type: 'varchar', length: 10, default: 'system' })
  theme: 'light' | 'dark' | 'system';

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Better Auth columns, mapped so schema diffs stay clean; not used by this module. */
  @Column({ name: 'email_verified', type: 'boolean', default: false, select: false, insert: false, update: false })
  emailVerified: boolean;

  @Column({ type: 'text', nullable: true, select: false, insert: false, update: false })
  image: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  setActive(active: boolean, actorId: string): void {
    if (actorId === this.id && !active) throw new BusinessRuleError('You cannot deactivate your own account');
    this.isActive = active;
  }
}
