import type { TFunction } from 'i18next';
import { ApiError } from '@/core/api/api-client';
import { errorMessage } from '@/shared/lib/error-message';
import type { ImportColumn } from './types';

interface Issue {
  path?: (string | number)[];
  message?: string;
}
interface RuleDetails {
  path?: string;
  messageAr?: string;
  messageEn?: string;
}

/** The sentence for a row the server refused, led by the column the person sees in the file (when the API says which field it is about). */
export function rowErrorMessage(t: TFunction, error: unknown, columns: ImportColumn[], language: string): string {
  const header = (id: unknown) => columns.find((c) => c.id === id)?.header;
  const details = error instanceof ApiError ? error.details : undefined;
  if (Array.isArray(details)) {
    const named = (details as Issue[]).filter((i) => header(i.path?.[0]));
    if (named.length) return named.map((i) => `${header(i.path?.[0])}: ${i.message ?? ''}`).join(' · ');
  }
  const rule = details as RuleDetails | undefined;
  const column = header(rule?.path);
  if (!column) return errorMessage(t, error);
  return `${column}: ${(language === 'ar' ? rule?.messageAr : rule?.messageEn) ?? errorMessage(t, error)}`;
}
