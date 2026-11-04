import type { DirectoryQuery } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useCompanyOptions } from '@/core/api/lookups';
import { useMe } from '@/core/auth/session';
import type { FilterValues } from '@/shared/lib/use-filters';
import type { FilterField } from '@/shared/ui';
import { useJobTitleOptions } from './api';

/** What «My team» can be narrowed by: the company (a unit may be shared by several) and a job title of the person's own unit. */
export function useTeamFilterFields(): FilterField[] {
  const { t, i18n } = useTranslation('employees', { keyPrefix: 'team' });
  const ar = i18n.language === 'ar';
  const companies = useCompanyOptions().data ?? [];
  const titles = useJobTitleOptions(useMe().data?.placement.orgNodeId ?? undefined).data ?? [];
  return [
    { id: 'companyId', label: t('company'), type: 'select', options: companies.map((c) => ({ value: c.id, label: ar ? c.nameAr : c.nameEn })) },
    { id: 'jobTitleId', label: t('jobTitle'), type: 'select', options: titles.map((x) => ({ value: x.id, label: ar ? x.nameAr : x.nameEn })) },
  ];
}

export function toTeamQuery(values: FilterValues): Partial<DirectoryQuery> {
  const text = (id: string) => values[id] || undefined;
  return { companyId: text('companyId'), jobTitleId: text('jobTitleId') };
}
