import { PROVIDER_FIELDS, providerFieldError, type ProviderKey, type ProviderValue, type ProviderValues } from '@arweqah-platform/shared';
import type { SentValues } from './api';

/** What the form holds: the plain fields, and the secrets the person typed (a secret already saved stays out until retyped). */
export interface ProviderForm {
  values: ProviderValues;
  secrets: Record<string, string>;
}

export const formFrom = (providerKey: ProviderKey, saved: ProviderValues): ProviderForm => {
  const values: ProviderValues = {};
  for (const field of PROVIDER_FIELDS[providerKey]) {
    const value = saved[field.key] ?? field.defaultValue;
    if (!field.secret && value !== undefined) values[field.key] = value;
  }
  return { values, secrets: {} };
};

/** The body of a save or a test: blank plain fields are sent as null (cleared), secrets only when typed. */
export function toSent(providerKey: ProviderKey, form: ProviderForm): SentValues {
  const sent: SentValues = {};
  for (const field of PROVIDER_FIELDS[providerKey]) {
    if (field.secret) {
      const typed = form.secrets[field.key]?.trim();
      if (typed) sent[field.key] = typed;
    } else {
      const value: ProviderValue | undefined = form.values[field.key];
      sent[field.key] = value === undefined || value === '' ? null : value;
    }
  }
  return sent;
}

/** What is still missing or wrong in the form; a saved secret counts as filled. */
export function formProblems(providerKey: ProviderKey, form: ProviderForm, secretsSet: string[]): { missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const field of PROVIDER_FIELDS[providerKey]) {
    const typed = field.secret ? form.secrets[field.key] : form.values[field.key];
    const problem = field.secret && !typed && secretsSet.includes(field.key) ? null : providerFieldError(field, typed);
    if (problem === 'required') missing.push(field.key);
    if (problem === 'invalid') invalid.push(field.key);
  }
  return { missing, invalid };
}
