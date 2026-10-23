import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminModeRepository } from '../domain/admin-mode.repository';
import type { AdminModeState } from '../domain/admin-mode.rules';

@Injectable()
export class TypeOrmAdminModeRepository extends AdminModeRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async find(sessionId: string): Promise<AdminModeState | null> {
    const rows: { enabled: Date | null; activity: Date | null }[] = await this.ds.query(
      'SELECT admin_mode_enabled_at AS enabled, admin_mode_last_activity_at AS activity FROM auth_sessions WHERE id = $1',
      [sessionId],
    );
    return rows[0] ? { enabledAt: rows[0].enabled, lastActivityAt: rows[0].activity } : null;
  }

  async activate(sessionId: string, userId: string, at: Date): Promise<void> {
    await this.ds.query('UPDATE auth_sessions SET admin_mode_enabled_at = $3, admin_mode_last_activity_at = $3 WHERE id = $1 AND user_id = $2', [sessionId, userId, at]);
  }

  async touch(sessionId: string, at: Date): Promise<void> {
    await this.ds.query('UPDATE auth_sessions SET admin_mode_last_activity_at = $2 WHERE id = $1 AND admin_mode_enabled_at IS NOT NULL', [sessionId, at]);
  }

  async deactivate(sessionId: string): Promise<void> {
    await this.ds.query('UPDATE auth_sessions SET admin_mode_enabled_at = NULL, admin_mode_last_activity_at = NULL WHERE id = $1', [sessionId]);
  }
}
