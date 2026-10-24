import { FormField, Select } from './form-field';

/** "Group by": a select with a "none" choice and the ways a list can be grouped. */
export function GroupSelect<V extends string>({ label, noneLabel, options, value, onChange }: { label: string; noneLabel: string; options: { value: V; label: string }[]; value: V | ''; onChange: (value: V | '') => void }) {
  return (
    <FormField label={label}>
      {(p) => (
        <Select {...p} className="min-w-44" value={value} onChange={(e) => onChange(e.target.value as V | '')}>
          <option value="">{noneLabel}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
    </FormField>
  );
}
