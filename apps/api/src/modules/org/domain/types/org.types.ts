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
  companyId: string;
  sortOrder: number;
  isAssignable: boolean;
  templateCode: string | null;
}

export interface NodeView extends Names {
  id: string;
  companyId: string;
  levelId: string;
  parentId: string | null;
  managerId: string | null;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  isActive: boolean;
  sortOrder: number;
}

export interface TitleView extends Names {
  id: string;
  orgNodeId: string;
  isActive: boolean;
}

export interface NodePath {
  pathAr: string;
  pathEn: string;
}
