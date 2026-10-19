import { ShieldCheck } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const securityFeature: FeatureModule = {
  id: 'security',
  routes: [{ path: '/security', lazy: () => import('./security-page').then((m) => ({ Component: m.SecurityPage })) }],
  nav: [{ to: '/security', labelKey: 'nav.security', icon: ShieldCheck }],
  i18n: { ar, en },
};
