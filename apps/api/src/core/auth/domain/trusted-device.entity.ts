import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

/** A browser the person chose to trust after the code step that follows a Microsoft sign-in: only a hash of its secret is kept. */
@Entity('trusted_devices')
export class TrustedDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_trusted_devices_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** SHA-256 of the secret in the browser's cookie. */
  @Index('UQ_trusted_devices_token', { unique: true })
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  /** «Chrome on Windows», read from the browser when it was trusted. */
  @Column({ type: 'varchar', length: 200, default: '' })
  label: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_trusted_devices_user' })
  private readonly userFk?: unknown;
}
