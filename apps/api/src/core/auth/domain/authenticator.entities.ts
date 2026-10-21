import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** What a one-time record of a user shares: an id, when it was used (null = unused) and when it was created. */
export abstract class OneTimeRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/**
 * The authenticator app (TOTP) of a user. The secret is stored encrypted. A row without `enabled_at`
 * is an enrollment in progress (QR shown, first code not confirmed yet).
 */
@Entity('authenticators')
export class Authenticator {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'secret_enc', type: 'text' })
  secretEnc: string;

  @Column({ name: 'enabled_at', type: 'timestamptz', nullable: true })
  enabledAt: Date | null;

  /** The latest accepted time step, so one code can never be used twice. */
  @Column({ name: 'last_used_step', type: 'bigint', nullable: true })
  lastUsedStep: string | null;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_authenticators_user' })
  private readonly userFk?: unknown;
}

/** Single-use recovery codes; only the SHA-256 hash is stored. */
@Entity('authenticator_backup_codes')
export class AuthenticatorBackupCode extends OneTimeRecord {
  @Index('IDX_backup_codes_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'code_hash', type: 'varchar', length: 64 })
  codeHash: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_backup_codes_user' })
  private readonly userFk?: unknown;
}

/** One-time link that lets a new employee enroll their authenticator app. The token itself is never stored. */
@Entity('enrollment_invites')
export class EnrollmentInvite extends OneTimeRecord {
  @Index('IDX_enrollment_invites_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index('UQ_enrollment_invites_token', { unique: true })
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_enrollment_invites_user' })
  private readonly userFk?: unknown;
}
