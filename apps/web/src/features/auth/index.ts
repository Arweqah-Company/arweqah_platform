import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';
import { LoginPage } from './pages/login-page';
import { TwoFactorPage } from './pages/two-factor-page';

export const authFeature: FeatureModule = {
  id: 'auth',
  publicRoutes: [
    { path: '/login', Component: LoginPage },
    { path: '/login/two-factor', Component: TwoFactorPage },
  ],
  i18n: { ar, en },
};
