import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { TemplatesTab } from './templates-tab';
export { KIND_KEYS as TEMPLATE_KEYS } from './keys';

/** The wording of e-mails and notifications. It has no page of its own: its two lists are tabs of the Settings page. */
export const templatesFeature: FeatureModule = {
  id: 'templates',
  i18n: { ar, en },
};
