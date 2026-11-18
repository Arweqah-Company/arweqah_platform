import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { returnedRows } from '../../../common/infrastructure/query-result';
import { EmailLoginCodeRepository } from '../domain/email-login-code.repository';

@Injectable()
export class TypeOrmEmailLoginCodeRepository extends EmailLoginCodeRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async issue({ userId, codeHash, expiresAt, now, cooldownMs }: { userId: string; codeHash: string; expiresAt: Date; now: Date; cooldownMs: number }): Promise<boolean> {
    const rows = returnedRows(
      await this.ds.query(
        `INSERT INTO email_login_codes (user_id, code_hash, expires_at, attempts, created_at) VALUES ($1, $2, $3, 0, $4)
         ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = EXCLUDED.created_at
         WHERE email_login_codes.created_at <= $5 RETURNING user_id`,
        [userId, codeHash, expiresAt, now, new Date(now.getTime() - cooldownMs)],
      ),
    );
    return rows.length > 0;
  }

  async consume({ userId, codeHash, now, maxAttempts }: { userId: string; codeHash: string; now: Date; maxAttempts: number }): Promise<boolean> {
    const spent = returnedRows(
      await this.ds.query('DELETE FROM email_login_codes WHERE user_id = $1 AND code_hash = $2 AND expires_at > $3 AND attempts < $4 RETURNING user_id', [userId, codeHash, now, maxAttempts]),
    );
    if (spent.length > 0) return true;
    await this.ds.query('UPDATE email_login_codes SET attempts = attempts + 1 WHERE user_id = $1', [userId]);
    return false;
  }
}
