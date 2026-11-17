import { CorePermission } from '@arweqah-platform/shared';
import { Settings } from 'lucide-react';
import { redirect } from 'react-router';
import { type FeatureModule } from '@/core/feature';
import { SECURITY_SETTINGS_KEYS } from '@/features/security';
import { TEMPLATE_KEYS } from '@/features/templates';
import { TOUR_KEYS } from '@/features/tour';
import ar from './i18n/ar.json';
import en from './i18n/en.json';
import { KIND_SETTINGS } from './keys';

/** The page is made of tabs, each with its own view key: the link shows for whoever holds one of them. */
const SETTINGS_VIEW_KEYS = [...Object.values(KIND_SETTINGS).map((k) => k.view), ...Object.values(TEMPLATE_KEYS).map((k) => k.view), TOUR_KEYS.view, SECURITY_SETTINGS_KEYS.view];

export const integrationsFeature: FeatureModule = {
  id: 'integrations',
  routes: [
    { path: '/service-settings', lazy: () => import('./settings-page').then((m) => ({ Component: m.SettingsPage })) },
    { path: '/translation-settings', loader: () => redirect('/service-settings?tab=translation') },
    { path: '/email-settings', loader: () => redirect('/service-settings?tab=email') },
  ],
  nav: [{ to: '/service-settings', labelKey: 'nav.serviceSettings', icon: Settings, group: 'administration', requiresAdminMode: true, anyPermission: SETTINGS_VIEW_KEYS }],
  tour: [
    { key: 'settings', target: '[data-tour="settings-tab:translation"]', route: '/service-settings', placement: 'bottom', can: [{ id: 'translation', permission: CorePermission.IntegrationsTranslationEdit }, { id: 'email', permission: CorePermission.IntegrationsEmailEdit }, { id: 'email_templates', permission: CorePermission.TemplatesEmailEdit }, { id: 'notification_templates', permission: CorePermission.TemplatesNotificationEdit }] },
  ],
  i18n: { ar, en },
};
