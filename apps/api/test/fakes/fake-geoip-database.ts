import type { AuditText } from '@arweqah-platform/shared';
import { GeoipDatabase, type GeoipInstall } from '../../src/core/integrations/domain/contracts/geoip-database';

/** MaxMind stand-in: a license key «good» installs a database that knows one address (203.0.113.9 is Riyadh); any other key is rejected. */
export class FakeGeoipDatabase extends GeoipDatabase {
  installed = false;
  readonly installs: { accountId: string; licenseKey: string }[] = [];

  async install(accountId: string, licenseKey: string): Promise<GeoipInstall> {
    this.installs.push({ accountId, licenseKey });
    if (licenseKey !== 'good') return { ok: false, message: 'MaxMind rejected the account number or the license key' };
    this.installed = true;
    return { ok: true, sizeMb: 62.5 };
  }

  async lookup(ip: string): Promise<AuditText | null> {
    return this.installed && ip === '203.0.113.9' ? { ar: 'Riyadh', en: 'Riyadh' } : null;
  }
}
