import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/shared/ui';
import { ComboField, SelectField, TextField } from './fields';
import type { EmployeeOptions } from './use-options';

export function PersonalSection({ options, sensitive }: { options: EmployeeOptions; sensitive: boolean }) {
  const { t } = useTranslation('employees');
  return (
    <SectionCard id="personal" title={t('sections.personal')}>
      <TextField name="employeeNumber" label={t('fields.employeeNumber')} required ltr />
      <TextField name="fullName" label={t('fields.fullName')} required />
      <TextField name="fullNameEn" label={t('fields.fullNameEn')} ltr />
      <SelectField name="gender" label={t('fields.gender')} options={options.genders} />
      <TextField name="birthDate" label={t('fields.birthDate')} type="date" hint={t('hints.age')} />
      <ComboField name="nationalityId" label={t('fields.nationalityId')} options={options.countries} clearable />
      <SelectField name="maritalStatusId" label={t('fields.maritalStatusId')} options={options.maritalStatuses} />
      <SelectField name="residencyStatusId" label={t('fields.residencyStatusId')} options={options.residencyStatuses} />
      {sensitive && <SelectField name="idTypeId" label={t('fields.idTypeId')} options={options.idTypes} />}
      {sensitive && <TextField name="idNumber" label={t('fields.idNumber')} ltr hint={t('hints.idNumber')} />}
      <TextField name="idExpiryDate" label={t('fields.idExpiryDate')} type="date" />
    </SectionCard>
  );
}
