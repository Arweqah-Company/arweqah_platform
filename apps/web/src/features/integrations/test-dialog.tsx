import type { IntegrationKind, ProviderKey } from '@arweqah-platform/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input, Textarea } from '@/shared/ui';
import { useTestProvider, type SentValues } from './api';
import { useTryTranslation } from './use-try-translation';

interface Props {
  kind: IntegrationKind;
  providerKey: ProviderKey;
  providerName: string;
  /** What is in the form; without it the saved data is used. */
  values?: SentValues;
  onClose: () => void;
}

/** Arabic on one side, the English on the other: typing Arabic translates after a short pause, and a problem is shown under the boxes. */
function TranslationTest({ kind, providerKey, values }: Omit<Props, 'onClose' | 'providerName'>) {
  const { t } = useTranslation('integrations');
  const [arabic, setArabic] = useState('');
  const { pending, english, problem } = useTryTranslation(kind, providerKey, values, arabic);
  return (
    <div className="flex flex-col gap-4">
      <FormField label={t('test.arabic')} hint={t('test.arabicHint')}>
        {(p) => <Textarea {...p} rows={3} maxLength={1000} value={arabic} onChange={(e) => setArabic(e.target.value)} />}
      </FormField>
      <FormField label={t('test.english')}>
        {(p) => <Textarea {...p} dir="ltr" rows={3} readOnly aria-live="polite" value={english} placeholder={pending ? t('test.translating') : undefined} />}
      </FormField>
      {pending && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden />{t('test.translating')}</p>}
      {problem && <Alert>{t('test.problem')}: <span dir="auto" className="break-words">{problem}</span></Alert>}
      {!problem && !pending && english && <Alert tone="success">{t('test.works')}</Alert>}
    </div>
  );
}

/** What the service answered to a test message: accepted, or the reason it refused. */
function EmailResult({ to, test }: { to: string; test: ReturnType<typeof useTestProvider> }) {
  const { t } = useTranslation('integrations');
  const { t: tc } = useTranslation();
  if (test.isError) return <Alert>{errorMessage(tc, test.error)}</Alert>;
  const result = test.data;
  if (!result) return null;
  if (result.ok) return <Alert tone="success">{t('test.sent', { to })}</Alert>;
  return <Alert>{t('test.problem')}: <span dir="auto" className="break-words">{result.message || t('test.failed')}</span></Alert>;
}

/** A short message to any address, sent with the data in the form; the provider's answer or its error is shown. */
function EmailTest({ kind, providerKey, values }: Omit<Props, 'onClose' | 'providerName'>) {
  const { t } = useTranslation('integrations');
  const { t: tc } = useTranslation();
  const test = useTestProvider(kind);
  const [to, setTo] = useState('');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim());
  return (
    <div className="flex flex-col gap-4">
      <FormField label={t('test.to')} hint={t('test.toHint')} error={to && !valid ? tc('validation.email') : undefined}>
        {(p) => <Input {...p} dir="ltr" type="email" value={to} onChange={(e) => setTo(e.target.value)} />}
      </FormField>
      <div className="flex justify-end">
        <Button disabled={!valid || test.isPending} onClick={() => test.mutate({ providerKey, values, to: to.trim() })}>{test.isPending ? t('test.sending') : t('test.send')}</Button>
      </div>
      <EmailResult to={to} test={test} />
    </div>
  );
}

export function TestDialog({ kind, providerKey, providerName, values, onClose }: Props) {
  const { t } = useTranslation('integrations');
  const Body = kind === 'translation' ? TranslationTest : EmailTest;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('test.title', { name: providerName })} description={t(`test.description.${kind}`)}>
      <Body kind={kind} providerKey={providerKey} values={values} />
      <p className="mt-4 text-xs text-muted">{t('test.note')}</p>
    </Dialog>
  );
}
