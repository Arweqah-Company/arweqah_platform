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
});
const asNumbers = (form: Typed): SecuritySettingsInput => ({
  trustedDeviceDays: Number(form.trustedDeviceDays),
  requestsPerMinute: Number(form.requestsPerMinute),
  impersonationEnabled: Number(form.impersonationEnabled),
  impersonationIdleMinutes: Number(form.impersonationIdleMinutes),
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
  const valid = (['trustedDeviceDays', 'requestsPerMinute', 'impersonationEnabled', 'impersonationIdleMinutes'] as const).every(inRange);
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
      <ImpersonationFields form={form} setForm={setForm} disabled={!canEdit} inRange={inRange} />
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
