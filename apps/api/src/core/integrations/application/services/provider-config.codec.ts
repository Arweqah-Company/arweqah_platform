import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PROVIDER_FIELDS, type ProviderKey, type ProviderValues } from '@arweqah-platform/shared';
import { FieldCipher } from '../../../../common/application/field-cipher';
import { AppConfig } from '../../../../config/app-config.service';

/** Secret fields are encrypted before they reach the database and decrypted when the platform needs to use them. */
@Injectable()
export class ProviderConfigCodec {
  constructor(
    private readonly cipher: FieldCipher,
    private readonly config: AppConfig,
  ) {}

  encrypt(providerKey: ProviderKey, values: ProviderValues): ProviderValues {
    return this.mapSecrets(providerKey, values, (v) => this.cipher.encrypt(v));
  }

  decrypt(providerKey: ProviderKey, stored: ProviderValues): ProviderValues {
    return this.mapSecrets(providerKey, stored, (v) => this.cipher.decrypt(v));
  }

  /** Keyed hash of the data (secrets included): equal data gives an equal fingerprint, and the hash reveals nothing. */
  fingerprint(providerKey: ProviderKey, values: ProviderValues): string {
    const ordered = PROVIDER_FIELDS[providerKey].map((f) => [f.key, values[f.key] ?? null]);
    return createHmac('sha256', this.config.get('BLIND_INDEX_KEY')).update(JSON.stringify([providerKey, ordered])).digest('hex');
  }

  private mapSecrets(providerKey: ProviderKey, values: ProviderValues, convert: (value: string) => string): ProviderValues {
    const out: ProviderValues = { ...values };
    for (const field of PROVIDER_FIELDS[providerKey]) {
      const value = out[field.key];
      if (field.secret && typeof value === 'string') out[field.key] = convert(value);
    }
    return out;
  }
}
