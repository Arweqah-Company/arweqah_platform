import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SecuritySettingsRepository } from '../domain/security-settings.repository';

@Injectable()
export class TypeOrmSecuritySettingsRepository extends SecuritySettingsRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async all(): Promise<Map<string, number>> {
    const rows: { key: string; value: number }[] = await this.ds.query('SELECT key, value FROM security_settings');
    return new Map(rows.map((r) => [r.key, r.value]));
  }

  async set(values: Record<string, number>, updatedBy: string | null): Promise<void> {
    await this.ds.transaction(async (m) => {
      for (const [key, value] of Object.entries(values)) {
        await m.query('INSERT INTO security_settings (key, value, updated_by) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()', [key, value, updatedBy]);
      }
    });
  }
}
