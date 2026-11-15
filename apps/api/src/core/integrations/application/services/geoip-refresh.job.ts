import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GeoipDatabase } from '../../domain/contracts/geoip-database';
import { ActiveProviders } from './active-providers.service';

/** MaxMind updates the free database every week: while the service is switched on, it is downloaded again every Monday at 03:00 (Riyadh). */
@Injectable()
export class GeoipRefreshJob {
  private readonly logger = new Logger(GeoipRefreshJob.name);

  constructor(
    private readonly active: ActiveProviders,
    private readonly database: GeoipDatabase,
  ) {}

  @Cron('0 3 * * 1', { timeZone: 'Asia/Riyadh' })
  async refresh(): Promise<boolean> {
    const provider = await this.active.of('geoip');
    if (!provider) return false;
    const done = await this.database.install(String(provider.values.accountId), String(provider.values.licenseKey));
    if (!done.ok) this.logger.error(`The weekly refresh of the city database failed: ${done.message}`);
    return done.ok;
  }
}
