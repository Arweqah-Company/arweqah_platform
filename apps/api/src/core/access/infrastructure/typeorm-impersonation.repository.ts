import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ImpersonationRepository, type ImpersonationSession } from '../domain/impersonation.repository';

/** `auth_sessions` belongs to the sign-in library (no entity), so these are plain parameterized statements like the admin-mode repository's. */
@Injectable()
export class TypeOrmImpersonationRepository extends ImpersonationRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async accountOf(userId: string): Promise<{ name: string; isActive: boolean } | null> {
    const rows: { name: string; active: boolean }[] = await this.ds.query('SELECT name, is_active AS active FROM users WHERE id = $1', [userId]);
    return rows[0] ? { name: rows[0].name, isActive: rows[0].active } : null;
  }

  async find(sessionId: string): Promise<ImpersonationSession | null> {
    const rows: { id: string; user: string; by: string; origin: string; started: Date }[] = await this.ds.query(
      `SELECT id, user_id AS "user", impersonated_by_user_id AS by, impersonator_session_id AS origin, created_at AS started
         FROM auth_sessions WHERE id = $1 AND impersonated_by_user_id IS NOT NULL`,
      [sessionId],
    );
    const row = rows[0];
    return row ? { id: row.id, userId: row.user, impersonatedBy: row.by, impersonatorSessionId: row.origin, startedAt: row.started } : null;
  }

  async tokenOfLiveSession(sessionId: string, now: Date): Promise<string | null> {
    const rows: { token: string }[] = await this.ds.query('SELECT token FROM auth_sessions WHERE id = $1 AND expires_at > $2', [sessionId, now]);
    return rows[0]?.token ?? null;
  }

  async touch(sessionId: string, at: Date): Promise<void> {
    await this.ds.query('UPDATE auth_sessions SET impersonation_last_activity_at = $2 WHERE id = $1', [sessionId, at]);
  }

  async end(sessionId: string): Promise<void> {
    await this.ds.query('DELETE FROM auth_sessions WHERE id = $1', [sessionId]);
  }
}
