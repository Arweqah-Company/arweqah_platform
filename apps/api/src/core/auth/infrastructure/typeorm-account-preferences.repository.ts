import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountPreferencesRepository, type AccountPreferences } from '../domain/account-preferences.repository';

@Injectable()
export class TypeOrmAccountPreferencesRepository extends AccountPreferencesRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async find(userId: string): Promise<AccountPreferences | null> {
    const rows: AccountPreferences[] = await this.ds.query('SELECT locale, theme FROM users WHERE id = $1', [userId]);
    return rows[0] ?? null;
  }

  async update(userId: string, patch: Partial<AccountPreferences>): Promise<void> {
    if (patch.locale !== undefined) await this.ds.query('UPDATE users SET locale = $2, updated_at = now() WHERE id = $1', [userId, patch.locale]);
    if (patch.theme !== undefined) await this.ds.query('UPDATE users SET theme = $2, updated_at = now() WHERE id = $1', [userId, patch.theme]);
  }
}
