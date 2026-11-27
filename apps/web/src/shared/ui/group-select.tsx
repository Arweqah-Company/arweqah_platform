import { useTranslation } from 'react-i18next';
import { FormField, Select } from './form-field';

/** "Group by": a select with a "none" choice and the ways a list can be grouped. The label and the "none" choice are the same words on every list (tickets and tasks said it two ways before). */
export function GroupSelect<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V | ''; onChange: (value: V | '') => void }) {
  const { t } = useTranslation();
  return (
    <FormField label={t('grouping.label')}>
      {(p) => (
        <Select {...p} className="min-w-44" value={value} onChange={(e) => onChange(e.target.value as V | '')}>
          <option value="">{t('grouping.none')}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
    </FormField>
  );
}
