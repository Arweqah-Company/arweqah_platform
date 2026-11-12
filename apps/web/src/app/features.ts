import type { FeatureModule } from '@/core/feature';
import { addTranslations } from '@/core/i18n';
import { auditFeature } from '@/features/audit';
import { emailLogFeature } from '@/features/email-log';
import { authFeature } from '@/features/auth';
import { careerProfileFeature } from '@/features/career-profile';
import { companiesFeature } from '@/features/companies';
import { integrationsFeature } from '@/features/integrations';
import { templatesFeature } from '@/features/templates';
import { docsFeature } from '@/features/docs';
import { employeesFeature } from '@/features/employees';
import { homeFeature } from '@/features/home';
import { myAccessFeature } from '@/features/my-access';
import { profileFeature } from '@/features/profile';
import { notificationsFeature } from '@/features/notifications';
import { listSettingsFeature } from '@/features/list-settings';
import { jobTitlesFeature } from '@/features/job-titles';
import { orgFeature } from '@/features/org';
import { performanceFeature } from '@/features/performance';
import { permissionsFeature } from '@/features/permissions';
import { pageVisibilityFeature } from '@/features/page-visibility';
import { exceptionsFeature } from '@/features/exceptions';
import { rolesFeature } from '@/features/roles';
import { securityFeature } from '@/features/security';
import { tasksFeature } from '@/features/tasks';
import { ticketsFeature } from '@/features/tickets';
import { tourFeature } from '@/features/tour';

/** Composition root: the list of features this app is built from (order = sidebar order). */
export const FEATURES: FeatureModule[] = [
  authFeature,
  homeFeature,
  employeesFeature,
  orgFeature,
  jobTitlesFeature,
  careerProfileFeature,
  performanceFeature,
  companiesFeature,
  tasksFeature,
  ticketsFeature,
  rolesFeature,
  exceptionsFeature,
  permissionsFeature,
  pageVisibilityFeature,
  listSettingsFeature,
  auditFeature,
  emailLogFeature,
  integrationsFeature,
  templatesFeature,
  notificationsFeature,
  profileFeature,
  docsFeature,
  myAccessFeature,
  securityFeature,
  tourFeature,
];

for (const feature of FEATURES) if (feature.i18n) addTranslations(feature.id, feature.i18n);
