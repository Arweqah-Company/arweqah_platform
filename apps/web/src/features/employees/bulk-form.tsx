import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox, FormField, Input, Select } from '@/shared/ui';
import { useJobTitleOptions, useManagerSearch, useOrgNodeOptions } from './api';
import { useEmployeeOptions } from './form/use-options';

/** What the bulk form holds: text (empty = leave as it is) and the day and reason of a placement change. */
export interface BulkValues {
  companyId: string;
  orgNodeId: string;
  jobTitleId: string;
  managerId: string;
  removeManager: boolean;
  workLocation: string;
  workMode: string;
  relationTypeId: string;
  validFrom: string;
  reason: string;
}

export const EMPTY_BULK: BulkValues = { companyId: '', orgNodeId: '', jobTitleId: '', managerId: '', removeManager: false, workLocation: '', workMode: '', relationTypeId: '', validFrom: '', reason: '' };

export const isPlacement = (v: BulkValues): boolean => !!(v.orgNodeId || v.jobTitleId || v.managerId || v.removeManager);

/** The API request for the form: only what the person filled (the unit and title change together when one of them is chosen). */
export function toBulkInput(v: BulkValues, employeeIds: string[], dryRun: boolean) {
  return {
    employeeIds,
    dryRun,
    ...(v.orgNodeId ? { orgNodeId: v.orgNodeId } : {}),
    ...(v.jobTitleId ? { jobTitleId: v.jobTitleId } : {}),
    ...(v.removeManager ? { managerId: null } : v.managerId ? { managerId: v.managerId } : {}),
    ...(v.workLocation.trim() ? { workLocation: v.workLocation.trim() } : {}),
    ...(v.workMode !== '' ? { workMode: Number(v.workMode) as 0 | 1 | 2 } : {}),
    ...(v.relationTypeId ? { relationTypeId: v.relationTypeId } : {}),
    ...(isPlacement(v) ? { validFrom: v.validFrom, reason: v.reason.trim() } : {}),
  };
}

/** Does the form have something to change, and (for a placement change) its day and reason? */
export const isBulkReady = (v: BulkValues): boolean => {
  const something = isPlacement(v) || !!v.workLocation.trim() || v.workMode !== '' || !!v.relationTypeId;
  return something && (!isPlacement(v) || (!!v.validFrom && !!v.reason.trim()));
};

interface Props {
  values: BulkValues;
  onChange: (values: BulkValues) => void;
}

/** The fields of a bulk edit. Everything is optional: a field left empty is not changed. */
export function BulkForm({ values, onChange }: Props) {
  const { t, i18n } = useTranslation('employees');
  const options = useEmployeeOptions();
  const [search, setSearch] = useState('');
  const ar = i18n.language === 'ar';
  const nodes = useOrgNodeOptions(values.companyId || undefined);
  const titles = useJobTitleOptions(values.orgNodeId || undefined);
  const managers = useManagerSearch(search);
  const set = (patch: Partial<BulkValues>) => onChange({ ...values, ...patch });
  const placement = isPlacement(values);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={t('fields.companyId')} hint={t('bulk.companyHint')}>{(p) => <Combobox id={p.id} label={t('fields.companyId')} value={values.companyId} options={options.companies} clearable onChange={(v) => set({ companyId: v ?? '', orgNodeId: '', jobTitleId: '' })} />}</FormField>
      <FormField label={t('fields.orgNodeId')}>{(p) => <Combobox id={p.id} label={t('fields.orgNodeId')} value={values.orgNodeId} disabled={!values.companyId} clearable options={(nodes.data ?? []).map((n) => ({ value: n.id, label: ar ? n.pathAr : n.pathEn }))} onChange={(v) => set({ orgNodeId: v ?? '', jobTitleId: '' })} />}</FormField>
      <FormField label={t('fields.jobTitleId')} hint={values.orgNodeId ? t('bulk.titleHint') : t('hints.pickUnitFirst')}>
        {(p) => (
          <Select {...p} value={values.jobTitleId} disabled={!values.orgNodeId} onChange={(e) => set({ jobTitleId: e.target.value })}>
            <option value="">{t('bulk.unchanged')}</option>
            {(titles.data ?? []).map((x) => <option key={x.id} value={x.id}>{ar ? x.nameAr : x.nameEn}</option>)}
          </Select>
        )}
      </FormField>
      <FormField label={t('fields.managerId')}>
        {(p) => <Combobox id={p.id} label={t('fields.managerId')} value={values.managerId} disabled={values.removeManager} clearable options={(managers.data ?? []).map((m) => ({ value: m.id, label: m.fullName, hint: m.employeeNumber }))} onSearch={setSearch} onChange={(v) => set({ managerId: v ?? '' })} />}
      </FormField>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="size-5 accent-petrol-800" checked={values.removeManager} onChange={(e) => set({ removeManager: e.target.checked, managerId: '' })} />
        {t('bulk.removeManager')}
      </label>
      {placement && (
        <>
          <FormField label={`${t('placementChange.effectiveFrom')} *`} hint={t('placementChange.effectiveFromHint')}>{(p) => <Input {...p} type="date" dir="ltr" value={values.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />}</FormField>
          <FormField label={`${t('placementChange.changeReason')} *`} hint={t('placementChange.changeReasonHint')}>{(p) => <Input {...p} value={values.reason} onChange={(e) => set({ reason: e.target.value })} />}</FormField>
        </>
      )}
      <FormField label={t('fields.workLocation')}>{(p) => <Input {...p} value={values.workLocation} onChange={(e) => set({ workLocation: e.target.value })} />}</FormField>
      <FormField label={t('fields.workMode')}>
        {(p) => (
          <Select {...p} value={values.workMode} onChange={(e) => set({ workMode: e.target.value })}>
            <option value="">{t('bulk.unchanged')}</option>
            {options.workModes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}
      </FormField>
      <FormField label={t('fields.relationTypeId')}>
        {(p) => (
          <Select {...p} value={values.relationTypeId} onChange={(e) => set({ relationTypeId: e.target.value })}>
            <option value="">{t('bulk.unchanged')}</option>
            {options.relationTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}
      </FormField>
    </div>
  );
}
