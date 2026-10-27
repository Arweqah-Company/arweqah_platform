import { Injectable } from '@nestjs/common';
import type { ProviderKey, ProviderValues } from '@arweqah-platform/shared';
import { Translator } from '../../domain/contracts/translator';
import { TranslatorFactory } from '../../domain/contracts/translator-factory';
import { AwsTranslator } from './aws-translator.adapter';
import { AzureTranslator } from './azure-translator.adapter';
import { GoogleTranslator } from './google-translator.adapter';

const text = (values: ProviderValues, key: string): string => String(values[key] ?? '');

/** Strategy selection: one class per provider, picked by the provider's key. */
@Injectable()
export class ProviderTranslatorFactory extends TranslatorFactory {
  create(providerKey: ProviderKey, values: ProviderValues): Translator {
    switch (providerKey) {
      case 'aws':
        return new AwsTranslator({ region: text(values, 'region'), accessKeyId: text(values, 'accessKeyId'), secretAccessKey: text(values, 'secretAccessKey') });
      case 'google':
        return new GoogleTranslator(text(values, 'serviceAccountJson'));
      case 'azure':
        return new AzureTranslator({ key: text(values, 'key'), region: text(values, 'region'), endpoint: text(values, 'endpoint') });
      default:
        throw new Error(`${providerKey} is not a translation provider`);
    }
  }
}
