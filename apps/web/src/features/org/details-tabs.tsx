import { CorePermission, type OrgTreeDto } from '@arweqah-platform/shared';
import type { ReactNode } from 'react';
import { CharterTab } from './charter-tab';
import { HistoryTab } from './history-tab';
import { LeadersTab } from './leaders-tab';
import type { OrgModel, OrgNode } from './org-model';
import { OverviewTab } from './overview-tab';
import { TitlesTab } from './titles-tab';
import type { OrgPageState } from './use-org-page';

/** What a tab of the details panel is given. */
export interface DetailsContext {
  page: OrgPageState;
  tree: OrgTreeDto;
  model: OrgModel;
  node: OrgNode;
}

export interface DetailsTab {
  id: string;
  /** Key in the org i18n namespace. */
  labelKey: string;
  /** The tab shows only for a person who holds it. */
  permission?: string;
  /** A `data-tour` mark on the tab for the welcome tour. */
  tour?: string;
  render: (ctx: DetailsContext) => ReactNode;
}

/**
 * The tabs of the details panel, in order, each with the permission that shows it (the leaders, the charter and the history are
 * read with the view key; changing them has its own keys inside the tab) and, where the welcome tour points at it, its `data-tour` mark.
 */
export const DETAILS_TABS: DetailsTab[] = [
  { id: 'overview', labelKey: 'tabs.overview', render: (ctx) => <OverviewTab {...ctx} /> },
  { id: 'leaders', labelKey: 'tabs.leaders', permission: CorePermission.OrgView, render: (ctx) => <LeadersTab {...ctx} /> },
  { id: 'titles', labelKey: 'tabs.titles', render: (ctx) => <TitlesTab {...ctx} /> },
  { id: 'charter', labelKey: 'tabs.charter', permission: CorePermission.OrgView, tour: 'org-charter', render: (ctx) => <CharterTab {...ctx} /> },
  { id: 'history', labelKey: 'tabs.history', permission: CorePermission.OrgView, render: (ctx) => <HistoryTab {...ctx} /> },
];
