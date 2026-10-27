import type { FeatureModule } from '@/core/feature';
import { addTranslations } from '@/core/i18n';
import { auditFeature } from '@/features/audit';
import { emailLogFeature } from '@/features/email-log';
import { authFeature } from '@/features/auth';
import { companiesFeature } from '@/features/companies';
import { integrationsFeature } from '@/features/integrations';
import { employeesFeature } from '@/features/employees';
import { homeFeature } from '@/features/home';
import { profileFeature } from '@/features/profile';
import { notificationsFeature } from '@/features/notifications';
import { listSettingsFeature } from '@/features/list-settings';
import { orgFeature } from '@/features/org';
import { permissionsFeature } from '@/features/permissions';
import { pageVisibilityFeature } from '@/features/page-visibility';
import { rolesFeature } from '@/features/roles';
import { securityFeature } from '@/features/security';
import { tasksFeature } from '@/features/tasks';
import { ticketsFeature } from '@/features/tickets';

/** Composition root: the list of features this app is built from (order = sidebar order). */
export const FEATURES: FeatureModule[] = [
  authFeature,
  homeFeature,
  employeesFeature,
  orgFeature,
  companiesFeature,
  tasksFeature,
  ticketsFeature,
  rolesFeature,
  permissionsFeature,
  pageVisibilityFeature,
  listSettingsFeature,
  auditFeature,
  emailLogFeature,
  integrationsFeature,
  notificationsFeature,
  profileFeature,
  securityFeature,
];

for (const feature of FEATURES) if (feature.i18n) addTranslations(feature.id, feature.i18n);
