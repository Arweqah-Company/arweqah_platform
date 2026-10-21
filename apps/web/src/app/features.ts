import type { FeatureModule } from '@/core/feature';
import { addTranslations } from '@/core/i18n';
import { auditFeature } from '@/features/audit';
import { emailLogFeature } from '@/features/email-log';
import { authFeature } from '@/features/auth';
import { companiesFeature } from '@/features/companies';
import { employeesFeature } from '@/features/employees';
import { homeFeature } from '@/features/home';
import { notificationsFeature } from '@/features/notifications';
import { orgFeature } from '@/features/org';
import { rolesFeature } from '@/features/roles';
import { securityFeature } from '@/features/security';

/** Composition root: the list of features this app is built from (order = sidebar order). */
export const FEATURES: FeatureModule[] = [
  authFeature,
  homeFeature,
  employeesFeature,
  orgFeature,
  companiesFeature,
  rolesFeature,
  auditFeature,
  emailLogFeature,
  notificationsFeature,
  securityFeature,
];

for (const feature of FEATURES) if (feature.i18n) addTranslations(feature.id, feature.i18n);
