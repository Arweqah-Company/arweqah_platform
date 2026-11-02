import { EXCEPTION_KINDS, type AccessExceptionDto, type ExceptionKind } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import type { FilterField } from '@/shared/ui';

type Filters = Record<string, string | undefined>;

const DAY_MS = 86_400_000;
export const EXPIRING_CHOICES = ['7', '14', '30', '60'] as const;

export const refOf = (x: AccessExceptionDto) => ({ kind: x.kind, userId: x.userId, targetId: x.targetId });
export const keyOf = (x: AccessExceptionDto): string => `${x.kind}:${x.userId}:${x.targetId}`;
export const targetName = (x: AccessExceptionDto, language: string): string => (language === 'ar' ? x.targetNameAr : x.targetNameEn);

/** Days from today to the last day (0 = today); null when there is no end date. */
export function daysLeft(expiresAt: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.parse(`${expiresAt}T00:00:00Z`) - today) / DAY_MS);
}

const FILTERS: Record<string, (x: AccessExceptionDto, value: string) => boolean> = {
  kind: (x, v) => x.kind === v,
  grantedBy: (x, v) => (x.grantedById ?? '') === v,
  expiring: (x, v) => (v === 'none' ? x.expiresAt === null : (daysLeft(x.expiresAt) ?? Infinity) <= Number(v)),
};

export function matchesExceptionFilters(x: AccessExceptionDto, search: { term: string; filters: Filters; language: string }): boolean {
  if (!matchesText([x.userName, targetName(x, search.language), x.grantedByName], search.term)) return false;
  return Object.entries(FILTERS).every(([id, test]) => !search.filters[id] || test(x, search.filters[id] as string));
}

export function exceptionFilterFields(t: TFunction, items: AccessExceptionDto[]): FilterField[] {
  const givers = new Map(items.flatMap((x) => (x.grantedById && x.grantedByName ? [[x.grantedById, x.grantedByName] as const] : [])));
  return [
    { id: 'kind', label: t('kind.label'), type: 'select', options: EXCEPTION_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) })) },
    { id: 'grantedBy', label: t('grantedBy'), type: 'select', options: [...givers].map(([value, label]) => ({ value, label })) },
    {
      id: 'expiring',
      label: t('expiring.label'),
      type: 'select',
      options: [...EXPIRING_CHOICES.map((days) => ({ value: days, label: t('expiring.within', { days }) })), { value: 'none', label: t('expiring.none') }],
    },
  ];
}

export function exceptionExportColumns(t: TFunction, language: string): ExportColumn<AccessExceptionDto>[] {
  return [
    { id: 'person', header: t('person'), value: (x) => x.userName },
    { id: 'kind', header: t('kind.label'), value: (x) => t(`kind.${x.kind as ExceptionKind}`) },
    { id: 'target', header: t('target'), value: (x) => targetName(x, language) },
    { id: 'scope', header: t('scope'), value: (x) => x.scope },
    { id: 'grantedBy', header: t('grantedBy'), value: (x) => x.grantedByName },
    { id: 'grantedAt', header: t('grantedAt'), value: (x) => x.grantedAt.slice(0, 10) },
    { id: 'expires', header: t('expires'), value: (x) => x.expiresAt },
  ];
}
