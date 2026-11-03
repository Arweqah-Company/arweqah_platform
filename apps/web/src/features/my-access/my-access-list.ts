import type { MyAccessGrantDto, PermissionScope } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import type { FilterField } from '@/shared/ui';

type Filters = Record<string, string | undefined>;

export const labelOf = (g: MyAccessGrantDto, language: string): string => (language === 'ar' ? g.labelAr : g.labelEn);
export const sourceName = (s: { nameAr: string; nameEn: string }, language: string): string => (language === 'ar' ? s.nameAr : s.nameEn);
/** The base of a scope (`subtree:2` is a «subtree»): what the scope filter offers. */
const baseOf = (scope: PermissionScope): string => scope.split(':')[0] as string;

const FILTERS: Record<string, (g: MyAccessGrantDto, value: string) => boolean> = {
  module: (g, v) => g.module === v,
  scope: (g, v) => baseOf(g.scope) === v,
  source: (g, v) => g.sources.some((s) => s.kind === v),
};

export function matchesGrantFilters(g: MyAccessGrantDto, search: { term: string; filters: Filters; language: string; moduleName: (module: string) => string }): boolean {
  const names = g.sources.map((s) => sourceName(s, search.language));
  if (!matchesText([g.labelAr, g.labelEn, g.key, search.moduleName(g.module), ...names], search.term)) return false;
  return Object.entries(FILTERS).every(([id, test]) => !search.filters[id] || test(g, search.filters[id] as string));
}

const SOURCE_KINDS = ['role', 'role_group', 'user_group', 'direct'] as const;

export function grantFilterFields(t: TFunction, grants: MyAccessGrantDto[], moduleName: (module: string) => string, scopeName: (scope: PermissionScope) => string): FilterField[] {
  const modules = [...new Set(grants.map((g) => g.module))];
  const scopes = [...new Set(grants.map((g) => baseOf(g.scope)))];
  return [
    { id: 'module', label: t('module'), type: 'select', options: modules.map((value) => ({ value, label: moduleName(value) })) },
    { id: 'scope', label: t('scope'), type: 'select', options: scopes.map((value) => ({ value, label: scopeName(value as PermissionScope) })) },
    { id: 'source', label: t('source'), type: 'select', options: SOURCE_KINDS.map((value) => ({ value, label: t(`sourceKind.${value}`) })) },
  ];
}

export function grantExportColumns(t: TFunction, language: string, moduleName: (module: string) => string, scopeName: (scope: PermissionScope) => string): ExportColumn<MyAccessGrantDto>[] {
  return [
    { id: 'permission', header: t('permission'), value: (g) => labelOf(g, language) },
    { id: 'module', header: t('module'), value: (g) => moduleName(g.module) },
    { id: 'scope', header: t('scope'), value: (g) => scopeName(g.scope) },
    { id: 'source', header: t('source'), value: (g) => g.sources.map((s) => sourceName(s, language)).join(' / ') },
  ];
}
