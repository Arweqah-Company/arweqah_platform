import type { JobTitleDto } from './schemas';
import type { ManagementMode } from './unit-types';
import type { OrgLevelDto } from './levels-and-rules';
import type { OrgTreeLeaderDto } from './unit-leaders';
import { z } from 'zod';

export const ORG_TREE_VIEWS = ['team', 'full'] as const;
export type OrgTreeView = (typeof ORG_TREE_VIEWS)[number];

/**
 * `view=team` (default): the viewer's own company, taken from the viewer, never from the request.
 * `view=full` and `asCompany` need `org.view_full`; `asCompany` marks which units that company would see.
 */
export const orgTreeQuerySchema = z.strictObject({
  view: z.enum(ORG_TREE_VIEWS).default('team'),
  asCompany: z.uuid().optional(),
});
export type OrgTreeQuery = z.infer<typeof orgTreeQuerySchema>;

export interface OrgTreeNodeDto {
  id: string;
  parentId: string | null;
  levelId: string;
  levelKey: string;
  code: string | null;
  nameAr: string;
  nameEn: string;
  managementMode: ManagementMode | null;
  effectiveMode: ManagementMode;
  isActive: boolean;
  startDate: string;
  managerId: string | null;
  managerName: string | null;
  /** Direct employees of the unit: of the viewer's company in the team view, all companies in the full view. */
  staffCount: number;
  /** Employees in the unit and everything under it, counted the same way. */
  subtreeStaffCount: number;
  /** Direct employees per company (full view only). */
  staffByCompany: Record<string, number> | null;
  titles: JobTitleDto[];
  /** With `asCompany`: whether a person of that company sees this unit; null otherwise. */
  visibleForCompany: boolean | null;
  /** Whether a company has employees directly in this unit and no leader (full view only). */
  hasNoLeader: boolean;
  /** A dated change (name, switch-off, charter) waits for its day. */
  hasScheduledChange: boolean;
  /** The leaders and acting leaders in force today (FR-100), with their company. */
  leaders: OrgTreeLeaderDto[];
}

/** A unit managed per company that has employees of the company and no leader row for that company. */
export interface NoLeaderDto {
  nodeId: string;
  companyId: string;
}

export interface OrgTreeDto {
  view: OrgTreeView;
  /** The company the tree is shown for: the viewer's own (team view), the chosen one (`asCompany`), or null (the whole structure). */
  companyId: string | null;
  levels: OrgLevelDto[];
  rules: Record<string, string[]>;
  nodes: OrgTreeNodeDto[];
  /** Units left out of the team view because nobody of the company is in or under them. */
  hiddenCount: number;
  /** Only for a holder of `org.view_full`; empty otherwise. */
  noLeader: NoLeaderDto[];
}
