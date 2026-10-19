import type { TFunction } from 'i18next';
import { ApiError } from '@/core/api/api-client';

/** Turns an API error into a sentence that says what happened and how to fix it. */
export function errorMessage(t: TFunction, error: unknown): string {
  if (!(error instanceof ApiError)) return t('errors.generic');
  if (error.status === 403) return t('errors.forbidden');
  if (error.status === 404) return t('errors.notFound');
  const key = `errors.${error.code}`;
  return t(key, { defaultValue: error.message || t('errors.generic') });
}
