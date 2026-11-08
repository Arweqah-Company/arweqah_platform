import type { LocalizedList, ManagementMode, DevelopmentStageName, OrgCharter, TitleTrack } from '@arweqah-platform/shared';

/** Read models the org repository returns. Names carry both languages. */
export interface Names {
  nameAr: string;
  nameEn: string;
}

export interface CompanyView extends Names {
  id: string;
  code: string;
  isActive: boolean;
}

export interface LevelView extends Names {
  id: string;
  /** Stable key of the type (`template_code`). */
  key: string;
  sortOrder: number;
  isAssignable: boolean;
  isBuiltIn: boolean;
  tone: string;
  codeSlot: number | null;
}

export interface NodeView extends Names {
  id: string;
  companyId: string;
  levelId: string;
  /** Key of the unit's type. */
  levelKey: string;
  parentId: string | null;
  managerId: string | null;
  code: string | null;
  /** Explicit mode, or null to inherit. */
  managementMode: ManagementMode | null;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  isActive: boolean;
  sortOrder: number;
  /** The charter in force today; null until one is written. */
  charter: OrgCharter | null;
}

/** The duties, qualifications and indicators of a title. */
export interface TitleContent {
  responsibilities: LocalizedList;
  qualifications: LocalizedList;
  kpis: LocalizedList;
}

export interface TitleView extends Names {
  id: string;
  orgNodeId: string;
  isActive: boolean;
  code: string | null;
  grade: number | null;
  track: TitleTrack | null;
  reportsToTitleId: string | null;
  contentVersion: number;
}

/** A title with its content (the card, the import). */
export interface TitleDetail extends TitleView, TitleContent {}

export interface NodePath {
  pathAr: string;
  pathEn: string;
}

/** Who a title is, for the modules that hang content on it (the career path). */
export interface TitleIdentityView {
  id: string;
  code: string | null;
  nameAr: string;
  nameEn: string;
  grade: number | null;
  track: TitleTrack | null;
  unit: { code: string | null; nameAr: string; nameEn: string };
  stage: { code: DevelopmentStageName; hoursPerYear: number; budgetCap: number } | null;
}
