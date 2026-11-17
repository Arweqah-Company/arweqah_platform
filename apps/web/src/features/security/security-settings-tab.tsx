import { SECURITY_SETTINGS, type SecuritySettingsInput } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, FormField, Input } from '@/shared/ui';
import { useSaveSecuritySettings, useSecuritySettings } from './api';
import { EmailDomainsCard } from './email-domains-card';
import { SECURITY_SETTINGS_KEYS } from './keys';

/** The security numbers: how long a trusted browser skips the code step after Microsoft sign-in (0 = off), and the request limit. */
export function SecuritySettingsTab() {
  const { t } = useTranslation('security');
  const { t: tc } = useTranslation();
  const settings = useSecuritySettings();
  if (settings.isError) return <Alert>{errorMessage(tc, settings.error)}</Alert>;
  if (!settings.data) return <p role="status" className="mt-4 text-sm text-muted">{t('settings.loading')}</p>;
  return (
    <>
      <SettingsForm initial={settings.data} />
      <EmailDomainsCard />
    </>
  );
}

type Typed = Record<keyof SecuritySettingsInput, string>;
const asText = (values: SecuritySettingsInput): Typed => ({
  trustedDeviceDays: String(values.trustedDeviceDays),
  requestsPerMinute: String(values.requestsPerMinute),
  impersonationEnabled: String(values.impersonationEnabled),
  impersonationIdleMinutes: String(values.impersonationIdleMinutes),
  agentEnabled: String(values.agentEnabled ?? SECURITY_SETTINGS.agentEnabled.default),
  agentMessagesPerHour: String(values.agentMessagesPerHour ?? SECURITY_SETTINGS.agentMessagesPerHour.default),
  agentDraftMinutes: String(values.agentDraftMinutes ?? SECURITY_SETTINGS.agentDraftMinutes.default),
  adminModeRequiresCode: String(values.adminModeRequiresCode ?? SECURITY_SETTINGS.adminModeRequiresCode.default),
});
const asNumbers = (form: Typed): SecuritySettingsInput => ({
  trustedDeviceDays: Number(form.trustedDeviceDays),
  requestsPerMinute: Number(form.requestsPerMinute),
  impersonationEnabled: Number(form.impersonationEnabled),
  impersonationIdleMinutes: Number(form.impersonationIdleMinutes),
  agentEnabled: Number(form.agentEnabled),
  agentMessagesPerHour: Number(form.agentMessagesPerHour),
  agentDraftMinutes: Number(form.agentDraftMinutes),
  adminModeRequiresCode: Number(form.adminModeRequiresCode),
});

function SettingsForm({ initial }: { initial: SecuritySettingsInput }) {
  const { t } = useTranslation('security');
  const { t: tc } = useTranslation();
  const canEdit = usePermissions().can(SECURITY_SETTINGS_KEYS.edit);
  const save = useSaveSecuritySettings();
  const [form, setForm] = useState<Typed>(() => asText(initial));
  const inRange = (key: keyof SecuritySettingsInput) => {
    const value = Number(form[key]);
    return form[key] !== '' && Number.isInteger(value) && value >= SECURITY_SETTINGS[key].min && value <= SECURITY_SETTINGS[key].max;
  };
  const valid = (['trustedDeviceDays', 'requestsPerMinute', 'impersonationEnabled', 'impersonationIdleMinutes', 'agentEnabled', 'agentMessagesPerHour', 'agentDraftMinutes', 'adminModeRequiresCode'] as const).every(inRange);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync(asNumbers(form));
      toast.success(t('settings.saved'));
    } catch {
      /* shown below */
    }
  };
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mt-4 flex max-w-xl flex-col gap-4 rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-5">
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      <FormField label={t('settings.trustedDeviceDays')} hint={t('settings.trustedDeviceDaysHint', { max: SECURITY_SETTINGS.trustedDeviceDays.max })} error={inRange('trustedDeviceDays') ? undefined : t('settings.range', SECURITY_SETTINGS.trustedDeviceDays)}>
        {(p) => <Input {...p} type="number" dir="ltr" inputMode="numeric" disabled={!canEdit} value={form.trustedDeviceDays} onChange={(e) => setForm((f) => ({ ...f, trustedDeviceDays: e.target.value }))} />}
      </FormField>
      <FormField label={t('settings.requestsPerMinute')} hint={t('settings.requestsPerMinuteHint')} error={inRange('requestsPerMinute') ? undefined : t('settings.range', SECURITY_SETTINGS.requestsPerMinute)}>
        {(p) => <Input {...p} type="number" dir="ltr" inputMode="numeric" disabled={!canEdit} value={form.requestsPerMinute} onChange={(e) => setForm((f) => ({ ...f, requestsPerMinute: e.target.value }))} />}
      </FormField>
      <AdminModeFields form={form} setForm={setForm} disabled={!canEdit} />
      <ImpersonationFields form={form} setForm={setForm} disabled={!canEdit} inRange={inRange} />
      <AgentFields form={form} setForm={setForm} disabled={!canEdit} inRange={inRange} />
      {canEdit && <div className="flex justify-end"><Button type="submit" disabled={!valid || save.isPending}>{tc('actions.save')}</Button></div>}
    </form>
  );
}

interface FieldsProps {
  form: Typed;
  setForm: (update: (form: Typed) => Typed) => void;
  disabled: boolean;
  inRange: (key: keyof SecuritySettingsInput) => boolean;
}

/** Platform admin mode: does switching it on ask for a code of the authenticator app? On by default; off only while testing (a warning says so). */
function AdminModeFields({ form, setForm, disabled }: Omit<FieldsProps, 'inRange'>) {
  const { t } = useTranslation('security');
  const required = form.adminModeRequiresCode === '1';
  return (
    <fieldset className="flex flex-col gap-3 border-t border-neutral-200 pt-4" data-tour="admin-mode-settings">
      <legend className="sr-only">{t('settings.adminModeGroup')}</legend>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 accent-petrol-800" disabled={disabled} checked={required} onChange={(e) => setForm((f) => ({ ...f, adminModeRequiresCode: e.target.checked ? '1' : '0' }))} />
        <span>
          <span className="block font-medium text-fg">{t('settings.adminModeRequiresCode')}</span>
          <span className="block text-muted">{t('settings.adminModeRequiresCodeHint')}</span>
        </span>
      </label>
      {!required && <Alert tone="warning">{t('settings.adminModeCodeOffWarning')}</Alert>}
    </fieldset>
  );
}

/** «Sign in as»: a switch (off by default) and the idle minutes after which that session ends. */
function ImpersonationFields({ form, setForm, disabled, inRange }: FieldsProps) {
  const { t } = useTranslation('security');
  return (
    <fieldset className="flex flex-col gap-4 border-t border-neutral-200 pt-4" data-tour="impersonation-settings">
      <legend className="sr-only">{t('settings.impersonationGroup')}</legend>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-5 accent-petrol-800"
          disabled={disabled}
          checked={form.impersonationEnabled === '1'}
          onChange={(e) => setForm((f) => ({ ...f, impersonationEnabled: e.target.checked ? '1' : '0' }))}
        />
        <span>
          <span className="block font-medium text-fg">{t('settings.impersonationEnabled')}</span>
          <span className="block text-muted">{t('settings.impersonationEnabledHint')}</span>
        </span>
      </label>
      <FormField label={t('settings.impersonationIdleMinutes')} hint={t('settings.impersonationIdleMinutesHint')} error={inRange('impersonationIdleMinutes') ? undefined : t('settings.range', SECURITY_SETTINGS.impersonationIdleMinutes)}>
        {(p) => <Input {...p} type="number" dir="ltr" inputMode="numeric" disabled={disabled} value={form.impersonationIdleMinutes} onChange={(e) => setForm((f) => ({ ...f, impersonationIdleMinutes: e.target.value }))} />}
      </FormField>
    </fieldset>
  );
}

/** The platform assistant's two numbers: messages an employee may send in an hour, and how long a request waits for confirmation (FR-147). */
function AgentFields({ form, setForm, disabled, inRange }: FieldsProps) {
  const { t } = useTranslation('security');
  const field = (key: 'agentMessagesPerHour' | 'agentDraftMinutes') => (
    <FormField label={t(`settings.${key}`)} hint={t(`settings.${key}Hint`)} error={inRange(key) ? undefined : t('settings.range', SECURITY_SETTINGS[key])}>
      {(p) => <Input {...p} type="number" dir="ltr" inputMode="numeric" disabled={disabled} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />}
    </FormField>
  );
  return (
    <fieldset className="flex flex-col gap-4 border-t border-neutral-200 pt-4" data-tour="agent-settings">
      <legend className="sr-only">{t('settings.agentGroup')}</legend>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 accent-petrol-800" disabled={disabled} checked={form.agentEnabled === '1'} onChange={(e) => setForm((f) => ({ ...f, agentEnabled: e.target.checked ? '1' : '0' }))} />
        <span>
          <span className="block font-medium text-fg">{t('settings.agentEnabled')}</span>
          <span className="block text-muted">{t('settings.agentEnabledHint')}</span>
        </span>
      </label>
      {field('agentMessagesPerHour')}
      {field('agentDraftMinutes')}
    </fieldset>
  );
}
