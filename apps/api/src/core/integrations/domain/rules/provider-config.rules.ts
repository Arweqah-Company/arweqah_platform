import { PROVIDER_FIELDS, type ProviderField, type ProviderKey, type ProviderValue, type ProviderValues } from '@arweqah-platform/shared';

const isBlank = (value: unknown): boolean => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

function coerce(field: ProviderField, value: ProviderValue): ProviderValue {
  if (field.type === 'number') return typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;
  if (field.type === 'boolean') return value === 'true' ? true : value === 'false' ? false : value;
  return typeof value === 'string' ? value.trim() : String(value);
}

function valueOf(field: ProviderField, stored: ProviderValues, incoming: Record<string, ProviderValue | null>): ProviderValue | undefined {
  if (!(field.key in incoming)) return stored[field.key];
  const given = incoming[field.key];
  // A blank secret means "leave it as it is": the browser never has the saved secret to send back.
  if (isBlank(given)) return field.secret ? stored[field.key] : undefined;
  return coerce(field, given as ProviderValue);
}

/** Saved data plus what the form sent: only the provider's own fields, blanks cleared, blank secrets kept, defaults filled in. */
export function mergeValues(providerKey: ProviderKey, stored: ProviderValues, incoming: Record<string, ProviderValue | null> = {}): ProviderValues {
  const merged: ProviderValues = {};
  for (const field of PROVIDER_FIELDS[providerKey]) {
    const value = valueOf(field, stored, incoming) ?? field.defaultValue;
    if (value !== undefined) merged[field.key] = value;
  }
  return merged;
}

/** Names of the fields whose value differs between two versions of the data (names only: values may be secret). */
export function changedFields(providerKey: ProviderKey, before: ProviderValues, after: ProviderValues): string[] {
  return PROVIDER_FIELDS[providerKey].filter((f) => before[f.key] !== after[f.key]).map((f) => f.key);
}

/** A provider's error text can echo what was sent; never let a secret reach the screen or a log. */
export function redactSecrets(providerKey: ProviderKey, values: ProviderValues, message: string): string {
  let safe = message;
  for (const field of PROVIDER_FIELDS[providerKey]) {
    const value = values[field.key];
    if (field.secret && typeof value === 'string' && value.length >= 4) safe = safe.split(value).join('***');
  }
  return safe.slice(0, 500);
}
