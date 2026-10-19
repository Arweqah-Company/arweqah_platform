import { House } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import { HomePage } from './home-page';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const homeFeature: FeatureModule = {
  id: 'home',
  routes: [{ index: true, Component: HomePage }],
  nav: [{ to: '/', labelKey: 'nav.home', icon: House }],
  i18n: { ar, en },
};
