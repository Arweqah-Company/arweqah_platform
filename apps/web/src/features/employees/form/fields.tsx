import type { ReactNode } from 'react';
import { Controller, useFormContext, type ControllerRenderProps } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Combobox, FormField, Input, Select, Textarea, type ComboboxOption } from '@/shared/ui';
import type { FormState } from './form-state';

type TextName = Exclude<keyof FormState, 'isGosiRegistered' | 'isQiwaContract' | 'hasMedicalInsurance' | 'roleIds'>;
type BooleanName = 'isGosiRegistered' | 'isQiwaContract' | 'hasMedicalInsurance';

/** The error text under a field: a rule's own words when the API sent them, otherwise a message per field. */
function useFieldError(name: string): string | undefined {
  const { t } = useTranslation('employees');
  const { formState } = useFormContext<FormState>();
  const error = (formState.errors as Record<string, { message?: string; type?: string } | undefined>)[name];
  if (!error?.message) return undefined;
  // A message that came back from the API is already in the user's language.
  if (error.type === 'server' || error.type === 'rule') return error.message;
  return error.message === 'required' ? t('validation.required') : t(`validation.${error.message}`, { defaultValue: t('validation.invalid') });
}

interface BaseProps {
  name: TextName;
  label: string;
  required?: boolean;
  hint?: string;
}

const withStar = (label: string, required?: boolean) => (required ? `${label} *` : label);

export function TextField({ name, label, required, hint, type = 'text', ltr, readOnly }: BaseProps & { type?: 'text' | 'email' | 'tel' | 'date' | 'number'; ltr?: boolean; readOnly?: boolean }) {
  const { register } = useFormContext<FormState>();
  const error = useFieldError(name);
  return (
    <FormField label={withStar(label, required)} hint={hint} error={error}>
      {(p) => <Input {...p} type={type} readOnly={readOnly} aria-required={required} dir={ltr || type !== 'text' ? 'ltr' : undefined} step={type === 'number' ? '0.01' : undefined} min={type === 'number' ? 0 : undefined} {...register(name)} />}
    </FormField>
  );
}

export function TextAreaField({ name, label }: { name: TextName; label: string }) {
  const { register } = useFormContext<FormState>();
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <Textarea id={name} rows={3} maxLength={2000} {...register(name)} />
    </div>
  );
}

type FieldRender = (props: { id: string; 'aria-invalid': boolean }, field: ControllerRenderProps<FormState, TextName>) => ReactNode;

/** A form-context field under a label with its live error: the one place where a controlled input meets react-hook-form. */
function ControlledField({ name, label, required, hint, children }: BaseProps & { children: FieldRender }) {
  const { control } = useFormContext<FormState>();
  const error = useFieldError(name);
  return (
    <FormField label={withStar(label, required)} hint={hint} error={error}>
      {(p) => <Controller control={control} name={name} render={({ field }) => <>{children(p, field)}</>} />}
    </FormField>
  );
}

export function SelectField({ name, label, options, required, hint }: BaseProps & { options: { value: string; label: string }[] }) {
  const { t } = useTranslation('employees');
  return (
    <ControlledField name={name} label={label} required={required} hint={hint}>
      {(p, field) => (
        <Select {...p} aria-required={required} value={String(field.value ?? '')} onBlur={field.onBlur} onChange={(e) => field.onChange(e.target.value)}>
          <option value="">{t('choose')}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      )}
    </ControlledField>
  );
}

export function ComboField({ name, label, options, required, hint, disabled, onSearch, onPick, clearable }: BaseProps & { options: ComboboxOption[]; disabled?: boolean; onSearch?: (q: string) => void; onPick?: (value: string | null) => void; clearable?: boolean }) {
  return (
    <ControlledField name={name} label={label} required={required} hint={hint}>
      {(p, field) => (
        <Combobox id={p.id} label={label} value={field.value as string} options={options} disabled={disabled} invalid={p['aria-invalid']} clearable={clearable} onSearch={onSearch} onChange={(v) => { field.onChange(v ?? ''); onPick?.(v); }} />
      )}
    </ControlledField>
  );
}

export function CheckField({ name, label }: { name: BooleanName; label: string }) {
  const { register } = useFormContext<FormState>();
  return (
    <label className="flex items-center gap-2 self-end pb-2 text-sm">
      <input type="checkbox" className="size-4 accent-petrol-800" {...register(name)} />
      {label}
    </label>
  );
}
