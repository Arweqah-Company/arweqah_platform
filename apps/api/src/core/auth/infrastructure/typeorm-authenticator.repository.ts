import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { returnedRows } from '../../../common/infrastructure/query-result';
import {
  AuthenticatorRepository,
  type AuthenticatorRecord,
  type AuthUser,
  type InviteRecord,
} from '../domain/authenticator.repository';

interface UserRow {
  id: string;
  email: string;
  name: string;
  locale: 'ar' | 'en';
  is_active: boolean;
}

const toUser = (r: UserRow): AuthUser => ({ id: r.id, email: r.email, name: r.name, locale: r.locale, isActive: r.is_active });

@Injectable()
export class TypeOrmAuthenticatorRepository extends AuthenticatorRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async userById(id: string): Promise<AuthUser | null> {
    const rows: UserRow[] = await this.ds.query('SELECT id, email, name, locale, is_active FROM users WHERE id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async userByEmail(email: string): Promise<AuthUser | null> {
    const rows: UserRow[] = await this.ds.query('SELECT id, email, name, locale, is_active FROM users WHERE email = $1', [email]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async find(userId: string): Promise<AuthenticatorRecord | null> {
    const rows: { secret_enc: string; enabled_at: Date | null; last_used_step: string | null; failed_count: number; locked_until: Date | null }[] =
      await this.ds.query('SELECT secret_enc, enabled_at, last_used_step, failed_count, locked_until FROM authenticators WHERE user_id = $1', [userId]);
    const r = rows[0];
    return r
      ? { userId, secretEnc: r.secret_enc, enabledAt: r.enabled_at, lastUsedStep: r.last_used_step === null ? null : Number(r.last_used_step), failedCount: r.failed_count, lockedUntil: r.locked_until }
      : null;
  }

  async savePending(userId: string, secretEnc: string): Promise<void> {
    await this.ds.query(
      `INSERT INTO authenticators (user_id, secret_enc) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET secret_enc = EXCLUDED.secret_enc, failed_count = 0, locked_until = NULL, updated_at = now()
       WHERE authenticators.enabled_at IS NULL`,
      [userId, secretEnc],
    );
  }

  async enable(userId: string, step: number, backupCodeHashes: string[]): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('UPDATE authenticators SET enabled_at = now(), last_used_step = $2, failed_count = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1', [userId, step]);
      await m.query('DELETE FROM authenticator_backup_codes WHERE user_id = $1', [userId]);
      for (const hash of backupCodeHashes) await m.query('INSERT INTO authenticator_backup_codes (user_id, code_hash) VALUES ($1, $2)', [userId, hash]);
    });
  }

  async recordSuccess(userId: string, step: number | null): Promise<void> {
    await this.ds.query('UPDATE authenticators SET failed_count = 0, locked_until = NULL, last_used_step = COALESCE($2, last_used_step), updated_at = now() WHERE user_id = $1', [userId, step]);
  }

  async recordFailure(userId: string, limit: { maxFailures: number; lockMs: number }): Promise<void> {
    await this.ds.query(
      `UPDATE authenticators
       SET failed_count = CASE WHEN failed_count + 1 >= $2 THEN 0 ELSE failed_count + 1 END,
           locked_until = CASE WHEN failed_count + 1 >= $2 THEN now() + ($3 || ' milliseconds')::interval ELSE locked_until END,
           updated_at = now()
       WHERE user_id = $1`,
      [userId, limit.maxFailures, String(limit.lockMs)],
    );
  }

  async useBackupCode(userId: string, codeHash: string): Promise<boolean> {
    const rows = returnedRows<{ id: string }>(
      await this.ds.query('UPDATE authenticator_backup_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL RETURNING id', [userId, codeHash]),
    );
    return rows.length > 0;
  }

  async remove(userId: string): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('DELETE FROM authenticator_backup_codes WHERE user_id = $1', [userId]);
      await m.query('DELETE FROM authenticators WHERE user_id = $1', [userId]);
    });
  }

  async replaceInvite(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('DELETE FROM enrollment_invites WHERE user_id = $1 AND used_at IS NULL', [userId]);
      await m.query('INSERT INTO enrollment_invites (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt]);
    });
  }

  async findInvite(tokenHash: string): Promise<InviteRecord | null> {
    const rows: { id: string; user_id: string; expires_at: Date; used_at: Date | null }[] = await this.ds.query(
      'SELECT id, user_id, expires_at, used_at FROM enrollment_invites WHERE token_hash = $1',
      [tokenHash],
    );
    const r = rows[0];
    return r ? { id: r.id, userId: r.user_id, expiresAt: r.expires_at, usedAt: r.used_at } : null;
  }

  async markInviteUsed(inviteId: string): Promise<void> {
    await this.ds.query('UPDATE enrollment_invites SET used_at = now() WHERE id = $1', [inviteId]);
  }

  async markSessionVerified(sessionId: string, userId: string): Promise<void> {
    await this.ds.query('UPDATE auth_sessions SET mfa_verified_at = now() WHERE id = $1 AND user_id = $2', [sessionId, userId]);
  }
}
