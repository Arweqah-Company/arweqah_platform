import { PROVIDER_FIELDS, providerProblems, type IntegrationKind, type ProviderDto, type ProviderKey, type ProviderStatus, type ProviderValues } from '@arweqah-platform/shared';
import type { IntegrationProvider } from '../../domain/entities/integration-provider.entity';

interface Source {
  kind: IntegrationKind;
  providerKey: ProviderKey;
  row: IntegrationProvider | null;
  /** The data in plain form (decrypted). */
  plain: ProviderValues;
  /** Fingerprint of `plain`: the row is "tested" only while its verified fingerprint equals it. */
  fingerprint: string;
}

const statusOf = (complete: boolean, tested: boolean): ProviderStatus => (!complete ? 'incomplete' : tested ? 'tested' : 'untested');

const plainValues = (providerKey: ProviderKey, plain: ProviderValues): ProviderValues => {
  const values: ProviderValues = {};
  for (const field of PROVIDER_FIELDS[providerKey]) if (!field.secret && plain[field.key] !== undefined) values[field.key] = plain[field.key]!;
  return values;
};

const secretsFilled = (providerKey: ProviderKey, plain: ProviderValues): string[] => PROVIDER_FIELDS[providerKey].filter((f) => f.secret && plain[f.key] !== undefined).map((f) => f.key);

/** A provider as the dashboard sees it: no secrets, only which of them are filled. */
export function toProviderDto({ kind, providerKey, row, plain, fingerprint }: Source): ProviderDto {
  const { missing, invalid } = providerProblems(providerKey, plain);
  const tested = !!row && row.verifiedHash === fingerprint;
  return {
    kind,
    providerKey,
    status: statusOf(!missing.length && !invalid.length, tested),
    isActive: row?.isActive ?? false,
    values: plainValues(providerKey, plain),
    secretsSet: secretsFilled(providerKey, plain),
    missing,
    invalid,
    testedAt: tested ? (row.verifiedAt?.toISOString() ?? null) : null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}
