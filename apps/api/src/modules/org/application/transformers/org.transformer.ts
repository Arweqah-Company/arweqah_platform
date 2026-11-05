import type { CompanyDto, JobTitleDto, ManagementMode, OrgLevelDto, OrgNodeDto } from '@arweqah-platform/shared';
import type { CompanyView, LevelView, NodePath, NodeView, TitleView } from '../../domain/types/org.types';

export const toCompanyDto = (c: CompanyView, employeesCount: number): CompanyDto => ({
  id: c.id,
  code: c.code,
  nameAr: c.nameAr,
  nameEn: c.nameEn,
  isActive: c.isActive,
  employeesCount,
});

export const toLevelDto = (l: LevelView, unitsCount: number): OrgLevelDto => ({
  id: l.id,
  key: l.key,
  nameAr: l.nameAr,
  nameEn: l.nameEn,
  sortOrder: l.sortOrder,
  acceptsTitles: l.isAssignable,
  isBuiltIn: l.isBuiltIn,
  tone: l.tone,
  codeSlot: l.codeSlot,
  unitsCount,
});

export const toTitleDto = (t: TitleView, employeesCount: number): JobTitleDto => ({
  id: t.id,
  orgNodeId: t.orgNodeId,
  nameAr: t.nameAr,
  nameEn: t.nameEn,
  isActive: t.isActive,
  employeesCount,
  code: t.code,
  grade: t.grade,
  track: t.track,
  reportsToTitleId: t.reportsToTitleId,
  contentVersion: t.contentVersion,
});

export interface NodeDtoParts {
  effectiveMode: ManagementMode;
  path: NodePath | undefined;
  managerName: string | null;
  employeesCount: number;
  titles: JobTitleDto[];
}

export const toNodeDto = (n: NodeView, parts: NodeDtoParts): OrgNodeDto => ({
  id: n.id,
  companyId: n.companyId,
  levelId: n.levelId,
  levelKey: n.levelKey,
  parentId: n.parentId,
  code: n.code,
  nameAr: n.nameAr,
  nameEn: n.nameEn,
  pathAr: parts.path?.pathAr ?? n.nameAr,
  pathEn: parts.path?.pathEn ?? n.nameEn,
  managerId: n.managerId,
  managerName: parts.managerName,
  startDate: n.startDate,
  isActive: n.isActive,
  employeesCount: parts.employeesCount,
  jobTitles: parts.titles,
  managementMode: n.managementMode,
  effectiveMode: parts.effectiveMode,
});
