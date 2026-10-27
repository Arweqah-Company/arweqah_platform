import type { HideablePage } from '@arweqah-platform/shared';
import type { LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';

export type NavGroupId = 'people' | 'tasks' | 'tickets' | 'administration' | 'account';

export interface NavItem {
  to: string;
  /** Translation key in the common namespace, e.g. "nav.users". */
  labelKey: string;
  icon: LucideIcon;
  /** Puts the link under a collapsible menu in the sidebar; no group = a top-level link. */
  group?: NavGroupId;
  /** Hidden from users without it (the API enforces it regardless). */
  permission?: string;
  /** Highlight this link only on its exact address (it is the start of its siblings' addresses). */
  end?: boolean;
  /** An admin page: shown only while platform admin mode is on (the API enforces it with @RequireAdminMode). */
  requiresAdminMode?: boolean;
  /** Left out of the sidebar for now; the route, its permission and its address still work. */
  hideFromMenu?: boolean;
  /** The page can be hidden from roles by an administrator (the API refuses it too, see HIDEABLE_PAGES). */
  pageKey?: HideablePage;
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
