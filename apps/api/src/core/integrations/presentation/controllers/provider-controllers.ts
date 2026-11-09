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

export const CaptchaProvidersController = integrationsController('captcha', 'captcha-settings', {
  view: CorePermission.IntegrationsCaptchaView,
  edit: CorePermission.IntegrationsCaptchaEdit,
  test: CorePermission.IntegrationsCaptchaTest,
  activate: CorePermission.IntegrationsCaptchaActivate,
});

export const AiProvidersController = integrationsController('ai', 'ai-settings', {
  view: CorePermission.IntegrationsAiView,
  edit: CorePermission.IntegrationsAiEdit,
  test: CorePermission.IntegrationsAiTest,
  activate: CorePermission.IntegrationsAiActivate,
});
