import type { HideablePage } from '@arweqah-platform/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { TEMPLATE_KEYS, TemplatesTab } from '@/features/templates';
import { Alert, PageHeader, Tabs } from '@/shared/ui';
import { KIND_SETTINGS } from './keys';
import { ProvidersPage } from './providers-page';

interface SettingsTab {
  id: 'translation' | 'email' | 'email-templates' | 'notification-templates';
  /** The permission that shows the tab, and the page an administrator can hide it with. */
  view: string;
  page: HideablePage;
  content: ReactNode;
}

const TABS: SettingsTab[] = [
  { id: 'translation', view: KIND_SETTINGS.translation.view, page: 'translation-settings', content: <ProvidersPage kind="translation" /> },
  { id: 'email', view: KIND_SETTINGS.email.view, page: 'email-settings', content: <ProvidersPage kind="email" /> },
  { id: 'email-templates', view: TEMPLATE_KEYS.email.view, page: 'email-templates', content: <TemplatesTab kind="email" /> },
  { id: 'notification-templates', view: TEMPLATE_KEYS.notification.view, page: 'notification-templates', content: <TemplatesTab kind="notification" /> },
];

/** Every service setting in one page: a tab for translation, e-mail, e-mail templates and notification templates, each shown only to who may view it. */
export function SettingsPage() {
  const { t } = useTranslation('integrations');
  const { can } = usePermissions();
  const hidden = useMe().data?.hiddenPages ?? [];
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((x) => can(x.view) && !hidden.includes(x.page));
  const current = tabs.find((x) => x.id === params.get('tab')) ?? tabs[0];
  return (
    <>
      <PageHeader title={t('title.settings')} description={t('description.settings')} />
      {current ? (
        <>
          <Tabs tabs={tabs.map((x) => ({ id: x.id, label: t(`tabs.${x.id}`) }))} value={current.id} label={t('tabsLabel')} onChange={(id) => setParams({ tab: id }, { replace: true })} />
          <div key={current.id}>{current.content}</div>
        </>
      ) : (
        <Alert tone="info">{t('noTabs')}</Alert>
      )}
    </>
  );
}
