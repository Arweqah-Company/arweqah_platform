import type { LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';

export interface NavItem {
  to: string;
  /** Translation key in the common namespace, e.g. "nav.users". */
  labelKey: string;
  icon: LucideIcon;
  /** Hidden from users without it (the API enforces it regardless). */
  permission?: string;
}

/**
 * What a feature contributes to the app. Adding a feature = writing its folder
 * and adding one line to app/features.ts.
 */
export interface FeatureModule {
  id: string;
  /** Routes inside the signed-in layout. */
  routes?: RouteObject[];
  /** Routes outside the layout (sign-in pages). */
  publicRoutes?: RouteObject[];
  nav?: NavItem[];
  /** Namespace = feature id; JSON files in the feature's i18n folder. */
  i18n?: { ar: TranslationBundle; en: TranslationBundle };
}

export type TranslationBundle = Record<string, unknown>;
