import type { ProblemReportSettingsDto, ProblemReportTypeOptionDto } from '@arweqah-platform/shared';
import { PROBLEM_REPORTS_PER_HOUR } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, FormField, Input } from '@/shared/ui';
import { useProblemReportSettings, useProblemReportTypes, useSaveProblemReportSettings } from './api';
import { PROBLEM_REPORT_KEYS } from './keys';

interface SwitchProps {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

/** A check box with its label and a line under it (the pattern of the other settings tabs). */
function SwitchRow({ label, hint, checked, disabled, onChange }: SwitchProps) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 size-5 accent-petrol-800" disabled={disabled} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-medium text-fg">{label}</span>
        <span className="block text-muted">{hint}</span>
      </span>
    </label>
  );
}

const inRange = (text: string): boolean => {
  const n = Number(text);
  return text !== '' && Number.isInteger(n) && n >= PROBLEM_REPORTS_PER_HOUR.min && n <= PROBLEM_REPORTS_PER_HOUR.max;
};

function typeLabel(language: string, type: ProblemReportTypeOptionDto): string {
  const ar = language !== 'en';
  return `${ar ? type.nameAr : type.nameEn} — ${ar ? type.deskNameAr : type.deskNameEn}`;
}

type Form = Omit<ProblemReportSettingsDto, 'maxPerHour'> & { maxPerHour: string };

interface AiFieldsProps {
  form: Form;
  setForm: (update: (form: Form) => Form) => void;
  disabled: boolean;
}

/** What the AI may do with a report: write the ticket, and (a second, separate choice) see the screenshot. */
function AiFields({ form, setForm, disabled }: AiFieldsProps) {
  const { t } = useTranslation('tickets');
  return (
    <>
      <SwitchRow label={t('problemReportSettings.analyze')} hint={t('problemReportSettings.analyzeHint')} checked={form.analyzeWithAi} disabled={disabled} onChange={(analyzeWithAi) => setForm((f) => ({ ...f, analyzeWithAi, sendImageToAi: analyzeWithAi && f.sendImageToAi }))} />
      <SwitchRow label={t('problemReportSettings.sendImage')} hint={t('problemReportSettings.sendImageHint')} checked={form.sendImageToAi} disabled={disabled || !form.analyzeWithAi} onChange={(sendImageToAi) => setForm((f) => ({ ...f, sendImageToAi }))} />
      {form.sendImageToAi && <Alert tone="warning">{t('problemReportSettings.sendImageWarning')}</Alert>}
    </>
  );
}

function SettingsForm({ initial, types }: { initial: ProblemReportSettingsDto; types: ProblemReportTypeOptionDto[] }) {
  const { t, i18n } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const canEdit = usePermissions().can(PROBLEM_REPORT_KEYS.edit);
  const save = useSaveProblemReportSettings();
  const [form, setForm] = useState<Form>({ ...initial, maxPerHour: String(initial.maxPerHour) });
  const complete = inRange(form.maxPerHour) && (!form.enabled || form.ticketTypeId !== null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ ...form, maxPerHour: Number(form.maxPerHour) });
      toast.success(t('problemReportSettings.saved'));
    } catch {
      /* shown above the form */
    }
  };
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mt-4 flex max-w-xl flex-col gap-4 rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-5">
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      <SwitchRow label={t('problemReportSettings.enabled')} hint={t('problemReportSettings.enabledHint')} checked={form.enabled} disabled={!canEdit} onChange={(enabled) => setForm((f) => ({ ...f, enabled }))} />
      <FormField label={t('problemReportSettings.type')} hint={t('problemReportSettings.typeHint')} error={form.enabled && form.ticketTypeId === null ? t('problemReportSettings.typeRequired') : undefined}>
        {(p) => <Combobox id={p.id} label={t('problemReportSettings.type')} value={form.ticketTypeId} disabled={!canEdit} options={types.map((x) => ({ value: x.typeId, label: typeLabel(i18n.language, x) }))} onChange={(ticketTypeId) => setForm((f) => ({ ...f, ticketTypeId }))} />}
      </FormField>
      <AiFields form={form} setForm={setForm} disabled={!canEdit} />
      <FormField label={t('problemReportSettings.perHour')} hint={t('problemReportSettings.perHourHint')} error={inRange(form.maxPerHour) ? undefined : t('problemReportSettings.range', PROBLEM_REPORTS_PER_HOUR)}>
        {(p) => <Input {...p} type="number" dir="ltr" inputMode="numeric" disabled={!canEdit} value={form.maxPerHour} onChange={(e) => setForm((f) => ({ ...f, maxPerHour: e.target.value }))} />}
      </FormField>
      {canEdit && <div className="flex justify-end"><Button type="submit" disabled={!complete || save.isPending}>{tc('actions.save')}</Button></div>}
    </form>
  );
}

/** Settings → Problem reports: the button on or off, the ticket type reports become, what the AI may do with them, and the hourly limit. */
export function ProblemReportSettingsTab() {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const settings = useProblemReportSettings();
  const types = useProblemReportTypes();
  if (settings.isError) return <Alert>{errorMessage(tc, settings.error)}</Alert>;
  if (!settings.data || !types.data) return <p role="status" className="mt-4 text-sm text-muted">{t('problemReportSettings.loading')}</p>;
  return <SettingsForm initial={settings.data} types={types.data} />;
}
