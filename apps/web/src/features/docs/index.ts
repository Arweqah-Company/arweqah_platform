import { BookOpen } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

/** The user manual: a page of the signed-in app (`/docs`) that shows each person only the sections of the pages they may open. */
export const docsFeature: FeatureModule = {
  id: 'docs',
  routes: [{ path: '/docs', lazy: () => import('./docs-page').then((m) => ({ Component: m.DocsPage })) }],
  nav: [{ to: '/docs', labelKey: 'nav.docs', icon: BookOpen, group: 'account' }],
  i18n: { ar, en },
};
