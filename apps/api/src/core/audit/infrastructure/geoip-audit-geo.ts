import { Injectable } from '@nestjs/common';
import type { AuditText } from '@arweqah-platform/shared';
import { ActiveProviders } from '../../integrations/application/services/active-providers.service';
import { GeoipDatabase } from '../../integrations/domain/contracts/geoip-database';
import { AuditGeo } from '../domain/audit-geo.port';

/** The city of an address, only while the address-locations service is switched on in the dashboard. */
@Injectable()
export class GeoipAuditGeo extends AuditGeo {
  constructor(
    private readonly active: ActiveProviders,
    private readonly database: GeoipDatabase,
  ) {
    super();
  }

  async cityOf(ip: string | null): Promise<AuditText | null> {
    if (!ip) return null;
    try {
      return (await this.active.of('geoip')) ? await this.database.lookup(ip) : null;
    } catch {
      return null; // the city is only an addition: a configuration that cannot be read must not fail the audit page
    }
  }
}
