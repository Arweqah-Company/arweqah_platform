import type { IntegrationKind, ProviderKey } from '@arweqah-platform/shared';
import type { IntegrationProvider } from '../entities/integration-provider.entity';

export abstract class IntegrationProviderRepository {
  abstract findAll(kind: IntegrationKind): Promise<IntegrationProvider[]>;
  abstract find(kind: IntegrationKind, providerKey: ProviderKey): Promise<IntegrationProvider | null>;
  abstract findActive(kind: IntegrationKind): Promise<IntegrationProvider | null>;
  abstract save(row: Partial<IntegrationProvider> & Pick<IntegrationProvider, 'kind' | 'providerKey'>): Promise<IntegrationProvider>;
  /** Makes one provider the active one of its kind and switches the previous one off, together. */
  abstract activate(kind: IntegrationKind, id: string): Promise<void>;
  abstract deactivate(kind: IntegrationKind): Promise<void>;
}
