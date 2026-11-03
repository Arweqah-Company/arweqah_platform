import { CorePermission } from '@arweqah-platform/shared';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { ExceptionsTab } from './exceptions-tab';

/** Exceptions live as a tab of the roles page (`/roles?tab=exceptions`); there is no page or menu item of their own. */
export const exceptionsFeature: FeatureModule = {
  id: 'exceptions',
  tour: [
    { key: 'exceptions', target: PAGE_TITLE_TARGET, route: '/roles?tab=exceptions', placement: 'bottom', can: [{ id: 'update', permission: CorePermission.ExceptionsUpdate }, { id: 'revoke', permission: CorePermission.ExceptionsRevoke }, { id: 'export', permission: CorePermission.ExceptionsExport }] },
  ],
  i18n: { ar, en },
};
