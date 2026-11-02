import type { RoleDto } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import type { FilterField } from '@/shared/ui';
import { ROLE_KINDS, roleKind } from './role-kind';

type Filters = Record<string, string | undefined>;

/** «Unit · company» of a job title role; empty for the other roles. */
export function roleOriginLabel(role: RoleDto, language: string): string {
  if (!role.origin) return '';
  const ar = language === 'ar';
  const unit = ar ? role.origin.unitNameAr : role.origin.unitNameEn;
  const company = ar ? role.origin.companyNameAr : role.origin.companyNameEn;
  return unit ? `${unit} · ${company}` : company;
}

const FILTERS: Record<string, (role: RoleDto, value: string) => boolean> = {
  company: (r, v) => r.origin?.companyId === v,
  type: (r, v) => r.isSystem === (v === 'system'),
  assignment: (r, v) => r.assignment === v,
  kind: (r, v) => roleKind(r) === v,
  holders: (r, v) => (r.usersCount > 0) === (v === 'with'),
};

export function matchesRoleFilters(role: RoleDto, search: { term: string; filters: Filters; language: string }): boolean {
  if (!matchesText([role.nameAr, role.nameEn, role.description, roleOriginLabel(role, search.language)], search.term)) return false;
  return Object.entries(FILTERS).every(([id, test]) => !search.filters[id] || test(role, search.filters[id] as string));
}

export function roleFilterFields(t: TFunction, roles: RoleDto[], language: string): FilterField[] {
  const companies = new Map(roles.flatMap((r) => (r.origin ? [[r.origin.companyId, language === 'ar' ? r.origin.companyNameAr : r.origin.companyNameEn] as const] : [])));
  return [
    { id: 'type', label: t('filters.type'), type: 'select', options: [{ value: 'system', label: t('system') }, { value: 'custom', label: t('filters.custom') }] },
    { id: 'assignment', label: t('assignment.label'), type: 'select', options: [{ value: 'auto', label: t('assignment.auto') }, { value: 'manual', label: t('assignment.manual') }] },
    { id: 'kind', label: t('kind.label'), type: 'select', options: ROLE_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) })) },
    { id: 'company', label: t('origin.company'), type: 'select', options: [...companies].map(([value, label]) => ({ value, label })) },
    { id: 'holders', label: t('holders'), type: 'select', options: [{ value: 'with', label: t('filters.withHolders') }, { value: 'without', label: t('filters.withoutHolders') }] },
  ];
}

export function roleExportColumns(t: TFunction, language: string): ExportColumn<RoleDto>[] {
  return [
    { id: 'nameAr', header: t('nameAr'), value: (r) => r.nameAr },
    { id: 'nameEn', header: t('nameEn'), value: (r) => r.nameEn },
    { id: 'description', header: t('descriptionColumn'), value: (r) => r.description },
    { id: 'assignment', header: t('assignment.label'), value: (r) => t(`assignment.${r.assignment}`) },
    { id: 'kind', header: t('kind.label'), value: (r) => t(`kind.${roleKind(r)}`) },
    { id: 'origin', header: t('origin.label'), value: (r) => roleOriginLabel(r, language) },
    { id: 'type', header: t('filters.type'), value: (r) => (r.isSystem ? t('system') : t('filters.custom')) },
    { id: 'permissions', header: t('permissions'), value: (r) => r.permissions.length },
    { id: 'holders', header: t('holders'), value: (r) => r.usersCount },
  ];
}
