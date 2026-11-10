import { useEffect, useMemo, useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CorePermission } from '@arweqah-platform/shared';
import { usePermissions } from '@/core/permissions/can';
import { SectionCard } from '@/shared/ui';
import { useJobTitleOptions, useManagerSearch, useOrgNodeOptions } from '../api';
import { CheckField, ComboField, SelectField, TextField, useLock } from './fields';
import type { FormState } from './form-state';
import type { EmployeeOptions } from './use-options';

interface Props {
  options: EmployeeOptions;
  /** The current manager of an employee being edited, so the picker can show their name before any search. */
  currentManager?: { id: string; fullName: string } | null;
  employeeId?: string;
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

/** When the unit, the title or the manager of an employee being edited is changed: from which day, and why (kept in the history). */
function PlacementChangeFields() {
  const { t } = useTranslation('employees');
  const { setValue, getValues } = useFormContext<FormState>();
  const { dirtyFields } = useFormState<FormState>();
  const changed = !!(dirtyFields.orgNodeId || dirtyFields.jobTitleId || dirtyFields.managerId);
  useEffect(() => {
    if (changed && !getValues('effectiveFrom')) setValue('effectiveFrom', today());
    if (!changed) {
      setValue('effectiveFrom', '');
      setValue('changeReason', '');
    }
  }, [changed, getValues, setValue]);
  if (!changed) return null;
  return (
    <>
      <TextField name="effectiveFrom" label={t('placementChange.effectiveFrom')} type="date" required hint={t('placementChange.effectiveFromHint')} />
      <TextField name="changeReason" label={t('placementChange.changeReason')} required hint={t('placementChange.changeReasonHint')} />
    </>
  );
}

/** Company → unit → job title → direct manager: each choice narrows the next, and the manager defaults from the unit. */
export function WorkSection({ options, currentManager, employeeId }: Props) {
  const { t, i18n } = useTranslation('employees');
  const { watch, setValue, getValues } = useFormContext<FormState>();
  const [search, setSearch] = useState('');
  /** Once the person chose (or cleared) the manager themselves, the unit no longer proposes one: the manager is never forced. */
  const [chosenByHand, setChosenByHand] = useState(false);
  const companyId = watch('companyId');
  const orgNodeId = watch('orgNodeId');
  const nodes = useOrgNodeOptions(companyId || undefined);
  const titles = useJobTitleOptions(orgNodeId || undefined);
  const { can } = usePermissions();
  const managers = useManagerSearch(search, employeeId, !useLock('managerId').locked);

  const nodeOptions = useMemo(() => (nodes.data ?? []).map((n) => ({ value: n.id, label: i18n.language === 'en' ? n.nameEn : n.nameAr })), [nodes.data, i18n.language]);
  const titleOptions = (titles.data ?? []).map((x) => ({ value: x.id, label: i18n.language === 'en' ? x.nameEn : x.nameAr }));
  const managerOptions = useMemo(() => {
    const found = (managers.data ?? []).map((m) => ({ value: m.id, label: m.fullName, hint: m.employeeNumber }));
    return currentManager && !found.some((m) => m.value === currentManager.id) ? [{ value: currentManager.id, label: currentManager.fullName }, ...found] : found;
  }, [managers.data, currentManager]);

  // A chosen unit proposes its manager to a new employee, unless the person already chose (or cleared) it by hand. The manager is optional.
  useEffect(() => {
    const node = nodes.data?.find((n) => n.id === orgNodeId);
    if (!employeeId && node && !chosenByHand && !getValues('managerId') && node.defaultManagerId) setValue('managerId', node.defaultManagerId);
  }, [employeeId, orgNodeId, nodes.data, chosenByHand, getValues, setValue]);

  const onCompany = (value: string | null) => {
    setValue('orgNodeId', '');
    setValue('jobTitleId', '');
    if (!chosenByHand) setValue('managerId', '');
    if (value && !getValues('contractCompanyId')) setValue('contractCompanyId', value);
  };

  return (
    <SectionCard id="work" title={t('sections.work')}>
      <ComboField name="companyId" label={t('fields.companyId')} options={options.companies} required onPick={onCompany} />
      <SelectField name="relationTypeId" label={t('fields.relationTypeId')} options={options.relationTypes} />
      <ComboField name="orgNodeId" label={t('fields.orgNodeId')} options={nodeOptions} required disabled={!companyId} hint={companyId ? undefined : t('hints.pickCompanyFirst')} onPick={() => setValue('jobTitleId', '')} />
      <SelectField name="jobTitleId" label={t('fields.jobTitleId')} options={titleOptions} required hint={orgNodeId ? undefined : t('hints.pickUnitFirst')} />
      {orgNodeId && can(CorePermission.OrgLeadersManage) && <CheckField name="leadsUnit" label={t('fields.leadsUnit')} />}
      <ComboField name="managerId" label={t('fields.managerId')} options={managerOptions} onSearch={setSearch} onPick={() => setChosenByHand(true)} clearable hint={t('hints.managerDefault')} />
      {employeeId && <PlacementChangeFields />}
      <TextField name="workLocation" label={t('fields.workLocation')} />
      <ComboField name="workCountryId" label={t('fields.workCountryId')} options={options.countries} clearable onPick={(v) => v && !getValues('salaryCurrencyCountryId') && setValue('salaryCurrencyCountryId', v)} />
      <SelectField name="workMode" label={t('fields.workMode')} options={options.workModes} />
    </SectionCard>
  );
}
