import type { AgentFormDto, AgentFormFieldDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/core/api/api-client';
import { Alert, Badge, Button, FormField, Input, Select, Textarea } from '@/shared/ui';

type Values = Record<string, unknown>;

interface Props {
  form: AgentFormDto;
  busy: boolean;
  /** The mistakes the server found, by field, after the last send. */
  error: unknown;
  onSubmit: (values: Values) => void;
}

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

function numberProblem(field: AgentFormFieldDto, value: unknown): 'range' | null {
  if (field.type !== 'number' && field.type !== 'integer') return null;
  const n = Number(value);
  return Number.isNaN(n) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max) ? 'range' : null;
}

/** What is wrong with a field right now, from its own rules (the server checks again, with the route's own schema). */
function problemOf(field: AgentFormFieldDto, value: unknown): 'required' | 'range' | 'tooLong' | null {
  if (isEmpty(value)) return field.required && field.type !== 'boolean' ? 'required' : null;
  if (typeof field.maxLength === 'number' && String(value).length > field.maxLength) return 'tooLong';
  return numberProblem(field, value);
}

function serverFields(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'AGENT_FORM_INVALID') return {};
  return ((error.details as { fields?: Record<string, string> } | undefined)?.fields) ?? {};
}

interface ControlProps {
  field: AgentFormFieldDto;
  value: unknown;
  onChange: (value: unknown) => void;
  props: Record<string, unknown>;
}

function ChoiceControl({ field, value, onChange, props }: ControlProps) {
  const { t } = useTranslation('agentChat');
  return (
    <Select {...props} value={isEmpty(value) ? '' : String(value)} searchable={(field.options?.length ?? 0) > 8} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('form.pick')}</option>
      {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

/** One field of the form, drawn by its kind: text, long text, number, date, check box or a list to choose from. */
function Control(control: ControlProps) {
  const { field, value, onChange, props } = control;
  const text = isEmpty(value) ? '' : String(value);
  if (field.type === 'select') return <ChoiceControl {...control} />;
  if (field.type === 'longtext') return <Textarea {...props} rows={3} value={text} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === 'boolean') return <input {...props} type="checkbox" className="size-5 accent-petrol-800" checked={value === true} onChange={(e) => onChange(e.target.checked)} />;
  const kind = field.type === 'date' ? 'date' : field.type === 'text' ? 'text' : 'number';
  return <Input {...props} type={kind} dir={kind === 'text' ? undefined : 'ltr'} value={text} onChange={(e) => onChange(e.target.value)} />;
}

/** The form the assistant opens inside its message (FR-152): the fields of the action, what it understood filled in, and «send» making the confirmation card. */
export function FormCard({ form, busy, error, onSubmit }: Props) {
  const { t } = useTranslation('agentChat');
  const [values, setValues] = useState<Values>(() => ({ ...form.values }));
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const fromServer = serverFields(error);
  const set = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setTouched((s) => new Set(s).add(name));
  };
  const message = (field: AgentFormFieldDto): string | undefined => {
    const local = touched.has(field.name) ? problemOf(field, values[field.name]) : null;
    if (local) return t(`form.problem.${local}`, { max: field.max, min: field.min, length: field.maxLength });
    return fromServer[field.name] ? t('form.problem.server', { message: fromServer[field.name] }) : undefined;
  };
  const valid = form.fields.every((f) => problemOf(f, values[f.name]) === null);
  return (
    <form className="mt-2 flex w-full flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3" noValidate onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(values); }}>
      {fromServer._form && <Alert tone="danger">{fromServer._form}</Alert>}
      {form.fields.map((field) => (
        <FormField key={field.name} label={field.required ? `${field.label} *` : field.label} error={message(field)}>
          {(props) => <Control field={field} value={values[field.name]} onChange={(v) => set(field.name, v)} props={props} />}
        </FormField>
      ))}
      <div className="flex justify-end"><Button type="submit" size="sm" disabled={busy || !valid}>{t('form.submit')}</Button></div>
    </form>
  );
}

/** What replaces the form once it was sent. */
export function FormSent() {
  const { t } = useTranslation('agentChat');
  return <Badge tone="success">{t('form.sent')}</Badge>;
}
