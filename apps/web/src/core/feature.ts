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
  /** Where the link stands in the sidebar: lower first, 50 when not given, equal ranks keep the order of the features (Home 0, My career path 1). */
  rank?: number;
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

/** Where a welcome-tour step points; the wording is `tour.<key>.{title,body}` in the owning feature's i18n (the code's default, an administrator may change it). */
export interface TourStepUi {
  /** A key of `TOUR_STEPS` in the shared package (permission and page rules live there). */
  key: string;
  /** CSS selector of the highlighted element: `data-tour` attributes, never style classes. */
  target: string;
  /** Opened first when the person is on another page. */
  route?: string;
  /** `start` and `end` follow the reading direction; `center` needs no element. */
  placement?: 'top' | 'bottom' | 'start' | 'end' | 'center' | 'auto';
  /** The step points into the account menu or the phone's side drawer, which the tour opens for it. */
  menu?: 'account' | 'drawer';
  /** What the person can do on the page, one line each: shown only for those whose permission the person holds (`tour.<key>.can.<id>`). */
  can?: { id: string; permission: string }[];
  /** Set by the tour for the sidebar step it adds before a page's own: the menu holding this link opens. */
  navOpen?: string;
}

/** The target of a page's heading: every page has one (`PageHeader`). */
/** The main thing a page is about (its list, chart, matrix or numbers): what a page's step highlights, never the title. */
export const PAGE_MAIN_TARGET = '[data-tour="main-list"]';

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
  /** Welcome-tour steps for this feature's pages (standing rule 9). */
  tour?: TourStepUi[];
  /** Namespace = feature id; JSON files in the feature's i18n folder. */
  i18n?: { ar: TranslationBundle; en: TranslationBundle };
}

export type TranslationBundle = Record<string, unknown>;
