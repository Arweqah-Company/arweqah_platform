import { PROVIDER_FIELDS, type ProviderKey } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Alert, Dialog } from '@/shared/ui';

/** What a service is and how to get each value of its form: the steps, then the meaning of every field. */
export function ProviderHelpDialog({ providerKey, onClose }: { providerKey: ProviderKey; onClose: () => void }) {
  const { t } = useTranslation('integrations');
  const steps = t(`help.providers.${providerKey}.steps`, { returnObjects: true }) as string[];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} wide title={t('help.title', { name: t(`providers.${providerKey}`) })} description={t(`help.providers.${providerKey}.summary`)}>
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 font-bold">{t('help.stepsTitle')}</h3>
          <ol className="list-decimal space-y-1.5 ps-6 text-sm">{steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <section>
          <h3 className="mb-2 font-bold">{t('help.fieldsTitle')}</h3>
          <dl className="space-y-3 text-sm">
            {PROVIDER_FIELDS[providerKey].map((f) => (
              <div key={f.key}>
                <dt className="font-medium">{t(`fields.${providerKey}.${f.key}`)}</dt>
                <dd className="text-muted">{t(`help.providers.${providerKey}.fields.${f.key}`)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <Alert tone="warning">{t('help.warn')}</Alert>
      </div>
    </Dialog>
  );
}
