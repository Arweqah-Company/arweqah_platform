import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';
import { InviteEnrollPage, SessionEnrollPage } from './pages/enroll-page';
import { LoginPage } from './pages/login-page';
import { VerifyPage } from './pages/verify-page';

export const authFeature: FeatureModule = {
  id: 'auth',
  publicRoutes: [
    { path: '/login', Component: LoginPage },
    { path: '/login/verify', Component: VerifyPage },
    { path: '/enroll/:token', Component: InviteEnrollPage },
    { path: '/enroll', Component: SessionEnrollPage },
  ],
  i18n: { ar, en },
};
