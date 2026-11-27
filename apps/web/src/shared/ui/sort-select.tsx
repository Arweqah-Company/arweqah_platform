import { FormField, Select } from './form-field';

/**
 * «Order»: a select with the ways a list can be ordered by date (newest or oldest first, and the list's own default). A value that is not one of
 * the choices (a list ordered from a column header) shows `otherLabel` and cannot be picked again.
 */
export function SortSelect({ label, options, value, onChange, otherLabel }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; otherLabel?: string }) {
  const known = options.some((o) => o.value === value);
  return (
    <FormField label={label}>
      {(p) => (
        <Select {...p} className="min-w-44" value={known ? value : ''} onChange={(e) => onChange(e.target.value)}>
          {!known && <option value="" disabled>{otherLabel ?? '—'}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
    </FormField>
  );
}
