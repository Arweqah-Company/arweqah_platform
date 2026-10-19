import type { FeatureModule } from '@/core/feature';
import { addTranslations } from '@/core/i18n';
import { auditFeature } from '@/features/audit';
import { authFeature } from '@/features/auth';
import { homeFeature } from '@/features/home';
import { notificationsFeature } from '@/features/notifications';
import { orgFeature } from '@/features/org';
import { rolesFeature } from '@/features/roles';
import { securityFeature } from '@/features/security';
import { usersFeature } from '@/features/users';

/** Composition root: the list of features this app is built from (order = sidebar order). */
export const FEATURES: FeatureModule[] = [
  authFeature,
  homeFeature,
  notificationsFeature,
  usersFeature,
  rolesFeature,
  orgFeature,
  auditFeature,
  securityFeature,
];

for (const feature of FEATURES) if (feature.i18n) addTranslations(feature.id, feature.i18n);
