import { Injectable } from '@nestjs/common';
import type { IntegrationKind } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { IntegrationProviderRepository } from '../../domain/contracts/integration-provider.repository';
import type { ActiveProvider } from '../../domain/types/integrations.types';
import { ACTIVE_CACHE_MS } from '../messages/integrations.messages';
import { ProviderConfigCodec } from './provider-config.codec';

/** What translation and e-mail ask: which provider is active and with what data. Cached briefly, dropped when an administrator changes it. */
@Injectable()
export class ActiveProviders {
  private readonly cache = new Map<IntegrationKind, { at: number; value: ActiveProvider | null }>();

  constructor(
    private readonly repo: IntegrationProviderRepository,
    private readonly codec: ProviderConfigCodec,
    private readonly clock: Clock,
  ) {}

  async of(kind: IntegrationKind): Promise<ActiveProvider | null> {
    const now = this.clock.now().getTime();
    const hit = this.cache.get(kind);
    if (hit && now - hit.at < ACTIVE_CACHE_MS) return hit.value;
    const value = await this.load(kind);
    this.cache.set(kind, { at: now, value });
    return value;
  }

  invalidate(kind: IntegrationKind): void {
    this.cache.delete(kind);
  }

  private async load(kind: IntegrationKind): Promise<ActiveProvider | null> {
    const row = await this.repo.findActive(kind);
    if (!row) return null;
    const values = this.codec.decrypt(row.providerKey, row.config);
    return { providerKey: row.providerKey, values, fingerprint: this.codec.fingerprint(row.providerKey, values) };
  }
}
