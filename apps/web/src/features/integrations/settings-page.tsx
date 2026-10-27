import type { IntegrationKind } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { Alert, PageHeader, Tabs } from '@/shared/ui';
import { KIND_SETTINGS } from './keys';
import { ProvidersPage } from './providers-page';

const KINDS: IntegrationKind[] = ['translation', 'email'];
const PAGE_OF = { translation: 'translation-settings', email: 'email-settings' } as const;

/** Every service setting in one page: a tab for translation and one for e-mail, each shown only to who may view it. */
export function SettingsPage() {
  const { t } = useTranslation('integrations');
  const { can } = usePermissions();
  const hidden = useMe().data?.hiddenPages ?? [];
  const [params, setParams] = useSearchParams();
  const kinds = KINDS.filter((k) => can(KIND_SETTINGS[k].view) && !hidden.includes(PAGE_OF[k]));
  const kind = kinds.find((k) => k === params.get('tab')) ?? kinds[0];
  return (
    <>
      <PageHeader title={t('title.settings')} description={t('description.settings')} />
      {kind ? (
        <>
          <Tabs tabs={kinds.map((id) => ({ id, label: t(`tabs.${id}`) }))} value={kind} label={t('tabsLabel')} onChange={(id) => setParams({ tab: id }, { replace: true })} />
          <ProvidersPage key={kind} kind={kind} />
        </>
      ) : (
        <Alert tone="info">{t('noTabs')}</Alert>
      )}
    </>
  );
}
