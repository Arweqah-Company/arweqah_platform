import { AI_PROVIDERS, providerFieldError, type FieldFormat, type ProviderField, type ProviderKey } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useLiveError } from '@/shared/lib/live-validation';
import { FormField, Input, Textarea } from '@/shared/ui';
import type { SentValues } from './api';
import { ModelField } from './model-field';

interface Props {
  providerKey: ProviderKey;
  field: ProviderField;
  value: string | number | boolean | undefined;
  /** The field is a secret that already holds a value on the server. */
  saved: boolean;
  disabled: boolean;
  onChange: (value: string | number | boolean) => void;
  /** What is in the form, for a field that asks the service something (the AI model list). */
  sent?: SentValues;
}

/** One field of a provider's form; its own component so "touched" starts fresh each time the dialog opens. */
export function ProviderFieldInput({ providerKey, field, value, saved, disabled, onChange, sent = {} }: Props) {
  const { t } = useTranslation('integrations');
  const { t: tc } = useTranslation();
  const live = useLiveError(value, (v: string | number | boolean | undefined) => {
    if (field.secret && saved && !v) return undefined;
    const problem = providerFieldError(field, v);
    if (problem === 'required') return tc('validation.required');
    return problem ? t(`invalid.${(field.format as FieldFormat | undefined) ?? field.type}`) : undefined;
  });
  const label = t(`fields.${providerKey}.${field.key}`);
  const hint = field.secret && saved ? t('secretSaved') : t(`hints.${providerKey}.${field.key}`, { defaultValue: '' }) || undefined;
  if (field.key === 'model' && (AI_PROVIDERS as readonly string[]).includes(providerKey)) {
    return <ModelField providerKey={providerKey} label={label} required={field.required} hint={hint} error={live.error} value={String(value ?? '')} disabled={disabled} sent={sent} onBlur={live.onBlur} onChange={onChange} />;
  }
  if (field.type === 'boolean') {
    return <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="size-4 accent-petrol-800" disabled={disabled} checked={value === true} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
  }
  const common = { dir: 'ltr' as const, disabled, onBlur: live.onBlur, autoComplete: 'off', spellCheck: false };
  return (
    <FormField label={field.required ? `${label} *` : label} error={live.error} hint={hint}>
      {(p) =>
        field.type === 'textarea' ? (
          <Textarea {...p} {...common} rows={6} value={String(value ?? '')} placeholder={saved ? t('secretSavedPlaceholder') : undefined} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input
            {...p}
            {...common}
            aria-required={field.required}
            type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
            autoComplete={field.type === 'password' ? 'new-password' : 'off'}
            placeholder={saved ? t('secretSavedPlaceholder') : undefined}
            value={String(value ?? '')}
            onChange={(e) => onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
          />
        )
      }
    </FormField>
  );
}
