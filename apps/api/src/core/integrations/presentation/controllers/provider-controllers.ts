import { CorePermission } from '@arweqah-platform/shared';
import { integrationsController } from './integrations.controller';

export const TranslationProvidersController = integrationsController('translation', 'translation-settings', {
  view: CorePermission.IntegrationsTranslationView,
  edit: CorePermission.IntegrationsTranslationEdit,
  test: CorePermission.IntegrationsTranslationTest,
  activate: CorePermission.IntegrationsTranslationActivate,
});

export const EmailProvidersController = integrationsController('email', 'email-settings', {
  view: CorePermission.IntegrationsEmailView,
  edit: CorePermission.IntegrationsEmailEdit,
  test: CorePermission.IntegrationsEmailTest,
  activate: CorePermission.IntegrationsEmailActivate,
});
