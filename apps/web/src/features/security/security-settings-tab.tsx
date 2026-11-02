import { SECURITY_SETTINGS, type SecuritySettingsInput } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, FormField, Input } from '@/shared/ui';
import { useSaveSecuritySettings, useSecuritySettings } from './api';
import { SECURITY_SETTINGS_KEYS } from './keys';

/** The security numbers: how long a trusted browser skips the code step after Microsoft sign-in (0 = off), and the request limit. */
export function SecuritySettingsTab() {
  const { t } = useTranslation('security');
  const { t: tc } = useTranslation();
  const settings = useSecuritySettings();
  if (settings.isError) return <Alert>{errorMessage(tc, settings.error)}</Alert>;
  if (!settings.data) return <p role="status" className="mt-4 text-sm text-muted">{t('settings.loading')}</p>;
  return <SettingsForm initial={settings.data} />;
}

type Typed = Record<keyof SecuritySettingsInput, string>;
const asText = (values: SecuritySettingsInput): Typed => ({ trustedDeviceDays: String(values.trustedDeviceDays), requestsPerMinute: String(values.requestsPerMinute) });

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
  const valid = inRange('trustedDeviceDays') && inRange('requestsPerMinute');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ trustedDeviceDays: Number(form.trustedDeviceDays), requestsPerMinute: Number(form.requestsPerMinute) });
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
      {canEdit && <div className="flex justify-end"><Button type="submit" disabled={!valid || save.isPending}>{tc('actions.save')}</Button></div>}
    </form>
  );
}
