import { PROVIDER_FIELDS, type IntegrationKind, type ProviderDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can, usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog } from '@/shared/ui';
import { toSent } from './form-values';
import { KIND_SETTINGS } from './keys';
import { ProviderFieldInput } from './provider-field';
import { TestDialog } from './test-dialog';
import { useProviderEditor } from './use-provider-editor';

/** Why the provider cannot be switched on yet, in the order the person should do things. */
function Guidance({ provider, edited, missing, invalid }: { provider: ProviderDto; edited: boolean; missing: string[]; invalid: string[] }) {
  const { t, i18n } = useTranslation('integrations');
  if (missing.length || invalid.length) {
    const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format([...missing, ...invalid].map((key) => t(`fields.${provider.providerKey}.${key}`)));
    return <Alert tone="warning">{t('guide.incomplete', { names })}</Alert>;
  }
  if (provider.isActive) return <Alert tone="success">{t('guide.active')}</Alert>;
  if (edited) return <Alert tone="info">{t('guide.edited')}</Alert>;
  if (provider.status === 'untested') return <Alert tone="info">{t('guide.untested')}</Alert>;
  return <Alert tone="success">{t('guide.tested')}</Alert>;
}

/** The data of one provider: save it, try it (a popup), and switch it on once it has passed a test with exactly this data. */
export function ProviderDialog({ kind, provider, onClose }: { kind: IntegrationKind; provider: ProviderDto; onClose: () => void }) {
  const { t } = useTranslation('integrations');
  const { t: tc } = useTranslation();
  const keys = KIND_SETTINGS[kind];
  const readOnly = !usePermissions().can(keys.edit);
  const editor = useProviderEditor(kind, provider);
  const [testing, setTesting] = useState(false);
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={editor.name} description={t(`description.${kind}`)}>
      <div className="flex flex-col gap-4">
        <Guidance provider={provider} edited={editor.edited} missing={editor.missing} invalid={editor.invalid} />
        {editor.failure && <Alert>{errorMessage(tc, editor.failure)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          {PROVIDER_FIELDS[provider.providerKey].map((field) => (
            <ProviderFieldInput
              key={field.key}
              providerKey={provider.providerKey}
              field={field}
              value={field.secret ? editor.form.secrets[field.key] : editor.form.values[field.key]}
              saved={!!field.secret && provider.secretsSet.includes(field.key)}
              disabled={readOnly}
              onChange={(value) => editor.change(field.key, !!field.secret, value)}
            />
          ))}
        </div>
        {provider.isActive && editor.edited && <Alert tone="warning">{t('guide.activeEdit')}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.close')}</Button>
          <Can permission={keys.edit}><Button variant="secondary" disabled={editor.saving || !editor.edited} onClick={() => void editor.saveForm()}>{tc('actions.save')}</Button></Can>
          <Can permission={keys.test}><Button variant="secondary" disabled={!editor.complete} onClick={() => setTesting(true)}>{t('test.open')}</Button></Can>
          <Can permission={keys.activate}><Button disabled={editor.activating || provider.status !== 'tested' || editor.edited || provider.isActive} onClick={() => void editor.switchOn()}>{t('activate')}</Button></Can>
        </div>
      </div>
      {testing && <TestDialog kind={kind} providerKey={provider.providerKey} providerName={editor.name} values={editor.edited ? toSent(provider.providerKey, editor.form) : undefined} onClose={() => setTesting(false)} />}
    </Dialog>
  );
}
