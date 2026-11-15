import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../../../../config/app-config.service';
import { MaxmindGeoipDatabase } from './maxmind-geoip.database';

describe('The installed city database (FR-132)', () => {
  it('answers no city while no database is installed, for any address', async () => {
    const database = new MaxmindGeoipDatabase({ get: () => '/nonexistent-storage' } as unknown as AppConfig);
    expect(await database.lookup('8.8.8.8')).toBeNull();
    expect(await database.lookup('not an address')).toBeNull();
  });
});
