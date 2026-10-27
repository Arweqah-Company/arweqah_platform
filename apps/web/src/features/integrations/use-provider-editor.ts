import type { IntegrationKind, ProviderDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useActivateProvider, useSaveProvider } from './api';
import { formFrom, formProblems, toSent, type ProviderForm } from './form-values';

/** The state of one provider's form: what is typed, whether it differs from what is saved, and the save and switch-on actions. */
export function useProviderEditor(kind: IntegrationKind, provider: ProviderDto) {
  const { t } = useTranslation('integrations');
  const save = useSaveProvider(kind);
  const activate = useActivateProvider(kind);
  const [form, setForm] = useState<ProviderForm>(() => formFrom(provider.providerKey, provider.values));
  const [edited, setEdited] = useState(false);
  const { missing, invalid } = formProblems(provider.providerKey, form, provider.secretsSet);
  const name = t(`providers.${provider.providerKey}`);
  const change = (key: string, secret: boolean, value: string | number | boolean) => {
    setEdited(true);
    setForm((f) => (secret ? { ...f, secrets: { ...f.secrets, [key]: String(value) } } : { ...f, values: { ...f.values, [key]: value } }));
  };
  // A refusal is shown in the dialog (`failure`), so a failed action only stays quiet here.
  const attempt = async (work: () => Promise<unknown>, done: string, after?: () => void) => {
    try {
      await work();
      toast.success(done);
      after?.();
    } catch {
      /* shown in the dialog */
    }
  };
  const saveForm = () => attempt(() => save.mutateAsync({ providerKey: provider.providerKey, values: toSent(provider.providerKey, form) }), t('saved'), () => {
    setEdited(false);
    setForm((f) => ({ ...f, secrets: {} }));
  });
  const switchOn = () => attempt(() => activate.mutateAsync(provider.providerKey), t('activated', { name }));
  return {
    form,
    edited,
    missing,
    invalid,
    complete: !missing.length && !invalid.length,
    name,
    change,
    saveForm,
    switchOn,
    saving: save.isPending,
    activating: activate.isPending,
    failure: save.error ?? activate.error,
  };
}
