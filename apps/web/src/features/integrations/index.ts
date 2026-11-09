import { CorePermission } from '@arweqah-platform/shared';
import { Settings } from 'lucide-react';
import { redirect } from 'react-router';
import { type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const integrationsFeature: FeatureModule = {
  id: 'integrations',
  routes: [
    { path: '/service-settings', lazy: () => import('./settings-page').then((m) => ({ Component: m.SettingsPage })) },
    { path: '/translation-settings', loader: () => redirect('/service-settings?tab=translation') },
    { path: '/email-settings', loader: () => redirect('/service-settings?tab=email') },
  ],
  nav: [{ to: '/service-settings', labelKey: 'nav.serviceSettings', icon: Settings, group: 'administration', requiresAdminMode: true }],
  tour: [
    { key: 'settings', target: '[data-tour="settings-tab:translation"]', route: '/service-settings', placement: 'bottom', can: [{ id: 'translation', permission: CorePermission.IntegrationsTranslationEdit }, { id: 'email', permission: CorePermission.IntegrationsEmailEdit }, { id: 'email_templates', permission: CorePermission.TemplatesEmailEdit }, { id: 'notification_templates', permission: CorePermission.TemplatesNotificationEdit }] },
  ],
  i18n: { ar, en },
};
