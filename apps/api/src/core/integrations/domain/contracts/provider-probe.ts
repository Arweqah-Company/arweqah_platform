import type { IntegrationKind, ProviderKey, ProviderValues, TestProviderInput, TestResultDto } from '@arweqah-platform/shared';

/**
 * Strategy: how to try a provider of one kind with the data in the form. Translation and e-mail each register their
 * own, so this module knows nothing about either. A probe never throws for a provider's own failure: it answers `ok: false`.
 */
export abstract class ProviderProbe {
  abstract readonly kind: IntegrationKind;
  abstract run(providerKey: ProviderKey, values: ProviderValues, input: TestProviderInput): Promise<TestResultDto>;
}
