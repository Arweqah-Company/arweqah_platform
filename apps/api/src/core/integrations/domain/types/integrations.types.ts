import type { ProviderKey, ProviderValues } from '@arweqah-platform/shared';

/** The provider the platform is using now, with its data in plain form (never sent to a browser). */
export interface ActiveProvider {
  providerKey: ProviderKey;
  values: ProviderValues;
  /** Changes whenever the data changes, so callers can keep a client built from it until then. */
  fingerprint: string;
}
