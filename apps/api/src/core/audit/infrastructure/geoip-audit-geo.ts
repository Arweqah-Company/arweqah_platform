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
    if (!ip || !(await this.active.of('geoip'))) return null;
    return this.database.lookup(ip);
  }
}
