import { CorePermission, type IntegrationKind, type ListKey } from '@arweqah-platform/shared';

interface KindSettings {
  view: string;
  edit: string;
  test: string;
  activate: string;
  exportKey: string;
  listKey: ListKey;
}

/** The permission keys and the list of each kind's page: translation and e-mail are separate pages with separate keys. */
export const KIND_SETTINGS: Record<IntegrationKind, KindSettings> = {
  translation: {
    view: CorePermission.IntegrationsTranslationView,
    edit: CorePermission.IntegrationsTranslationEdit,
    test: CorePermission.IntegrationsTranslationTest,
    activate: CorePermission.IntegrationsTranslationActivate,
    exportKey: CorePermission.IntegrationsTranslationExport,
    listKey: 'translation-providers',
  },
  email: {
    view: CorePermission.IntegrationsEmailView,
    edit: CorePermission.IntegrationsEmailEdit,
    test: CorePermission.IntegrationsEmailTest,
    activate: CorePermission.IntegrationsEmailActivate,
    exportKey: CorePermission.IntegrationsEmailExport,
    listKey: 'email-providers',
  },
  captcha: {
    view: CorePermission.IntegrationsCaptchaView,
    edit: CorePermission.IntegrationsCaptchaEdit,
    test: CorePermission.IntegrationsCaptchaTest,
    activate: CorePermission.IntegrationsCaptchaActivate,
    exportKey: CorePermission.IntegrationsCaptchaExport,
    listKey: 'captcha-providers',
  },
  ai: {
    view: CorePermission.IntegrationsAiView,
    edit: CorePermission.IntegrationsAiEdit,
    test: CorePermission.IntegrationsAiTest,
    activate: CorePermission.IntegrationsAiActivate,
    exportKey: CorePermission.IntegrationsAiExport,
    listKey: 'ai-providers',
  },
};
