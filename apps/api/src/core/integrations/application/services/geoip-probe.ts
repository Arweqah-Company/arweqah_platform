import { Injectable, OnModuleInit } from '@nestjs/common';
import type { ProviderKey, ProviderValues, TestProviderInput, TestResultDto } from '@arweqah-platform/shared';
import { GeoipDatabase } from '../../domain/contracts/geoip-database';
import { ProviderProbe } from '../../domain/contracts/provider-probe';
import { ProbeRegistry } from './probe-registry';

/** Trying the address-locations service downloads the city database with the data in the form: if it installs, the data is right. */
@Injectable()
export class GeoipProbe extends ProviderProbe implements OnModuleInit {
  readonly kind = 'geoip' as const;

  constructor(
    private readonly database: GeoipDatabase,
    private readonly registry: ProbeRegistry,
  ) {
    super();
  }

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(_providerKey: ProviderKey, values: ProviderValues, _input: TestProviderInput): Promise<TestResultDto> {
    const done = await this.database.install(String(values.accountId), String(values.licenseKey));
    return done.ok ? { ok: true, message: null, text: `${done.sizeMb} MB` } : { ok: false, message: done.message, text: null };
  }
}
