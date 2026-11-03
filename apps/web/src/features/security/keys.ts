import { CorePermission } from '@arweqah-platform/shared';

/** The permissions of the security settings tab. */
export const SECURITY_SETTINGS_KEYS = { view: CorePermission.SecuritySettingsView, edit: CorePermission.SecuritySettingsEdit } as const;
