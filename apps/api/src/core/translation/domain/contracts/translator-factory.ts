import type { ProviderKey, ProviderValues } from '@arweqah-platform/shared';
import type { Translator } from './translator';

/** Builds the translator (strategy) for one provider from its data. A test replaces it with a fake. */
export abstract class TranslatorFactory {
  abstract create(providerKey: ProviderKey, values: ProviderValues): Translator;
}
