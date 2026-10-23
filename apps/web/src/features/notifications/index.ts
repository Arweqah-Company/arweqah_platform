import { CorePermission } from '@arweqah-platform/shared';
import { Bell } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { NotificationBell } from './notification-bell';
export { useUnreadCount } from './api/notifications.api';

export const notificationsFeature: FeatureModule = {
  id: 'notifications',
  routes: [{ path: '/notifications', lazy: () => import('./notifications-page').then((m) => ({ Component: m.NotificationsPage })) }],
  nav: [{ to: '/notifications', labelKey: 'nav.notifications', icon: Bell, group: 'account', permission: CorePermission.NotificationsView }],
  i18n: { ar, en },
};
