import { Injectable } from '@nestjs/common';
import type { IntegrationKind } from '@arweqah-platform/shared';
import type { ProviderProbe } from '../../domain/contracts/provider-probe';

/** Translation and e-mail register how they are tried when they start (same idea as the permission catalog). */
@Injectable()
export class ProbeRegistry {
  private readonly probes = new Map<IntegrationKind, ProviderProbe>();

  register(probe: ProviderProbe): void {
    this.probes.set(probe.kind, probe);
  }

  get(kind: IntegrationKind): ProviderProbe {
    const probe = this.probes.get(kind);
    if (!probe) throw new Error(`No probe registered for ${kind}`);
    return probe;
  }
}
