import type { CompanyDto, JobTitleDto, OrgLevelDto, OrgNodeDto } from '@arweqah-platform/shared';
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
  companyId: l.companyId,
  sortOrder: l.sortOrder,
  nameAr: l.nameAr,
  nameEn: l.nameEn,
  isAssignable: l.isAssignable,
  templateCode: l.templateCode,
  unitsCount,
});

export const toTitleDto = (t: TitleView, employeesCount: number): JobTitleDto => ({
  id: t.id,
  orgNodeId: t.orgNodeId,
  nameAr: t.nameAr,
  nameEn: t.nameEn,
  isActive: t.isActive,
  employeesCount,
});

export interface NodeDtoParts {
  path: NodePath | undefined;
  managerName: string | null;
  employeesCount: number;
  titles: JobTitleDto[];
}

export const toNodeDto = (n: NodeView, parts: NodeDtoParts): OrgNodeDto => ({
  id: n.id,
  companyId: n.companyId,
  levelId: n.levelId,
  parentId: n.parentId,
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
});
