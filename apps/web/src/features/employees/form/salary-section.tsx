import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/shared/ui';
import { ComboField, TextField } from './fields';
import type { EmployeeOptions } from './use-options';

/** Shown only to those who hold employees.view_sensitive: salary, its currency and the IBAN. */
export function SalarySection({ options }: { options: EmployeeOptions }) {
  const { t } = useTranslation('employees');
  return (
    <SectionCard id="salary" title={t('sections.salary')}>
      <TextField name="monthlyGrossSalary" label={t('fields.monthlyGrossSalary')} type="number" ltr />
      <ComboField name="salaryCurrencyCountryId" label={t('fields.salaryCurrencyCountryId')} options={options.currencies} clearable hint={t('hints.currency')} />
      <TextField name="iban" label={t('fields.iban')} ltr hint={t('hints.iban')} />
    </SectionCard>
  );
}
