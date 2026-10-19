import type { PermissionScope } from './scope';

/** A permission a module declares in code. Roles are built from these at runtime. */
export interface PermissionDefinition {
  key: string;
  module: string;
  labelAr: string;
  labelEn: string;
  /** Scopes that make sense for this permission (e.g. org.manage is company-only). */
  scopes: readonly PermissionScope[];
}

export interface PermissionGrant {
  key: string;
  scope: PermissionScope;
}

export interface PermissionCatalogGroup {
  module: string;
  permissions: PermissionDefinition[];
}
