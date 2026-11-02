import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/shared/ui';
import { CheckField, ComboField, SelectField, TextField } from './fields';
import type { FormState } from './form-state';
import type { EmployeeOptions } from './use-options';

/** Clears the values of fields that just disappeared, so hidden values are never sent. */
function useClearWhenHidden(visible: boolean, ...names: (keyof FormState)[]): void {
  const { setValue } = useFormContext<FormState>();
  const key = names.join();
  useEffect(() => {
    if (!visible) for (const name of key.split(',') as (keyof FormState)[]) setValue(name, '' as never);
  }, [visible, key, setValue]);
}

function GosiFields({ options }: { options: EmployeeOptions }) {
  const { t } = useTranslation('employees');
  const gosi = useFormContext<FormState>().watch('isGosiRegistered');
  useClearWhenHidden(gosi, 'gosiCompanyId', 'gosiRegistrationDate', 'gosiSystemId');
  return (
    <>
      <CheckField name="isGosiRegistered" label={t('fields.isGosiRegistered')} />
      {gosi && <ComboField name="gosiCompanyId" label={t('fields.gosiCompanyId')} options={options.companies} clearable />}
      {gosi && <TextField name="gosiRegistrationDate" label={t('fields.gosiRegistrationDate')} type="date" required />}
      {gosi && <SelectField name="gosiSystemId" label={t('fields.gosiSystemId')} options={options.gosiSystems} required />}
    </>
  );
}

function InsuranceFields({ options }: { options: EmployeeOptions }) {
  const { t } = useTranslation('employees');
  const medical = useFormContext<FormState>().watch('hasMedicalInsurance');
  useClearWhenHidden(medical, 'healthInsuranceCompanyId');
  return (
    <>
      <CheckField name="isQiwaContract" label={t('fields.isQiwaContract')} />
      <CheckField name="hasMedicalInsurance" label={t('fields.hasMedicalInsurance')} />
      {medical && <ComboField name="healthInsuranceCompanyId" label={t('fields.healthInsuranceCompanyId')} options={options.companies} clearable />}
    </>
  );
}

/** The reason for ending the relationship shows only once an end date exists. */
function TerminationFields({ options }: { options: EmployeeOptions }) {
  const { t } = useTranslation('employees');
  const { watch } = useFormContext<FormState>();
  const [endDate, reasonId] = watch(['endDate', 'terminationReasonId']);
  const isOther = !!options.terminationReason(reasonId)?.isOther;
  useClearWhenHidden(!!endDate, 'terminationReasonId', 'terminationReasonOther');
  useClearWhenHidden(isOther, 'terminationReasonOther');
  return (
    <>
      {endDate && <SelectField name="terminationReasonId" label={t('fields.terminationReasonId')} options={options.terminationReasons} hint={t('hints.terminationReason')} />}
      {endDate && isOther && <TextField name="terminationReasonOther" label={t('fields.terminationReasonOther')} required />}
    </>
  );
}

/** Fields appear only when the options chosen above ask for them. */
export function ContractSection({ options }: { options: EmployeeOptions }) {
  const { t } = useTranslation('employees');
  const { watch } = useFormContext<FormState>();
  const contract = options.contractType(watch('contractTypeId'));
  const endRequired = contract?.requiresEndDate || options.relationLimited(watch('relationTypeId'));
  useClearWhenHidden(!!contract?.isOther, 'contractTypeOther');
  return (
    <SectionCard id="contract" title={t('sections.contract')}>
      <TextField name="startDate" label={t('fields.startDate')} type="date" required />
      <TextField name="endDate" label={endRequired ? `${t('fields.endDate')} *` : t('fields.endDate')} type="date" />
      <SelectField name="contractTypeId" label={t('fields.contractTypeId')} options={options.contractTypes} />
      {contract?.isOther && <TextField name="contractTypeOther" label={t('fields.contractTypeOther')} required />}
      <ComboField name="contractCompanyId" label={t('fields.contractCompanyId')} options={options.companies} clearable />
      <TextField name="profession" label={t('fields.profession')} />
      <GosiFields options={options} />
      <InsuranceFields options={options} />
      <TerminationFields options={options} />
    </SectionCard>
  );
}
