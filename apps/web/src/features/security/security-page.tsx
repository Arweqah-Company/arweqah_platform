import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { Alert, PageHeader } from '@/shared/ui';

/** Where a person sees how their sign-in is protected. There is no password; the authenticator app is the key. */
export function SecurityPage() {
  const { t } = useTranslation('security');
  const me = useMe().data;
  return (
    <div className="max-w-2xl">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="mt-6 flex flex-col gap-5 rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-6">
        <Alert tone={me?.authenticatorEnabled ? 'success' : 'warning'}>{me?.authenticatorEnabled ? t('enabled') : t('notEnabled')}</Alert>
        <section>
          <h2 className="text-lg font-bold">{t('howTitle')}</h2>
          <ul className="mt-2 list-disc ps-5 text-sm leading-7">
            <li>{t('howCode')}</li>
            <li>{t('howMicrosoft')}</li>
            <li>{t('howSessions')}</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold">{t('lostTitle')}</h2>
          <p className="mt-2 text-sm leading-7">{t('lostBody')}</p>
        </section>
      </div>
    </div>
  );
}
