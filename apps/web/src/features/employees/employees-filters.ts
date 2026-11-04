import type { EmployeesQuery } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { FilterField } from '@/shared/ui';
import type { FilterValues } from '@/shared/lib/use-filters';
import { useJobTitleOptions, useOrgNodeOptions } from './api';
import { useEmployeeOptions } from './form/use-options';

const STATUSES = ['active', 'inactive', 'needs-placement'] as const;

type Named = { value: string; label: string };

/** Everything the employee list can be filtered by. Unit follows the company, job title follows the unit. */
export function useEmployeeFilterFields(values: FilterValues): FilterField[] {
  const { t, i18n } = useTranslation('employees');
  const ar = i18n.language === 'ar';
  const options = useEmployeeOptions();
  const units = useOrgNodeOptions(values.companyId).data ?? [];
  const titles = useJobTitleOptions(values.orgNodeId).data ?? [];
  const select = (id: string, label: string, list: Named[]): FilterField => ({ id, label, type: 'select', options: list });
  return [
    select('companyId', t('fields.companyId'), options.companies),
    select('status', t('statusLabel'), STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))),
    select('relationTypeId', t('fields.relationTypeId'), options.relationTypes),
    ...(values.companyId ? [select('orgNodeId', t('fields.orgNodeId'), units.map((u) => ({ value: u.id, label: ar ? u.pathAr : u.pathEn })))] : []),
    ...(values.orgNodeId ? [select('jobTitleId', t('fields.jobTitleId'), titles.map((x) => ({ value: x.id, label: ar ? x.nameAr : x.nameEn })))] : []),
    select('contractTypeId', t('fields.contractTypeId'), options.contractTypes),
    select('nationalityId', t('fields.nationalityId'), options.countries),
    select('gender', t('fields.gender'), options.genders),
    select('workMode', t('fields.workMode'), options.workModes),
    select('maritalStatusId', t('fields.maritalStatusId'), options.maritalStatuses),
    select('residencyStatusId', t('fields.residencyStatusId'), options.residencyStatuses),
    { id: 'startFrom', label: t('filters.startFrom'), type: 'date' },
    { id: 'startTo', label: t('filters.startTo'), type: 'date' },
    { id: 'idExpiring', label: t('flags.idExpiring'), type: 'toggle' },
    { id: 'contractEnding', label: t('flags.contractEnding'), type: 'toggle' },
    { id: 'needsPlacement', label: t('flags.needsPlacement'), type: 'toggle' },
  ];
}

/** The filter values as the API's query (empty ones are left out; changing the company clears the unit and title). */
export function toEmployeesQuery(values: FilterValues): Partial<Omit<EmployeesQuery, 'employeeNumbers'>> {
  const text = (id: string) => values[id] || undefined;
  const number = (id: string) => (values[id] === undefined || values[id] === '' ? undefined : Number(values[id]));
  return {
    companyId: text('companyId'),
    status: text('status') as EmployeesQuery['status'],
    relationTypeId: text('relationTypeId'),
    orgNodeId: values.companyId ? text('orgNodeId') : undefined,
    jobTitleId: values.orgNodeId && values.companyId ? text('jobTitleId') : undefined,
    contractTypeId: text('contractTypeId'),
    nationalityId: text('nationalityId'),
    maritalStatusId: text('maritalStatusId'),
    residencyStatusId: text('residencyStatusId'),
    gender: number('gender'),
    workMode: number('workMode'),
    startFrom: text('startFrom'),
    startTo: text('startTo'),
    idExpiring: values.idExpiring === 'true' ? true : undefined,
    contractEnding: values.contractEnding === 'true' ? true : undefined,
    needsPlacement: values.needsPlacement === 'true' ? true : undefined,
  };
}
