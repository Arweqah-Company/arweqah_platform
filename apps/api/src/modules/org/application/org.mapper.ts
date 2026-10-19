import type { BranchDto, DepartmentDto, TeamDto } from '@arweqah-platform/shared';
import type { Branch, Department, Team } from '../domain/org.entities';

export const toBranchDto = (b: Branch): BranchDto => ({ id: b.id, nameAr: b.nameAr, nameEn: b.nameEn, code: b.code, city: b.city });

export const toDepartmentDto = (d: Department): DepartmentDto => ({
  id: d.id,
  nameAr: d.nameAr,
  nameEn: d.nameEn,
  branchId: d.branchId,
  parentId: d.parentId,
  headUserId: d.headUserId,
});

export const toTeamDto = (t: Team): TeamDto => ({
  id: t.id,
  nameAr: t.nameAr,
  nameEn: t.nameEn,
  departmentId: t.departmentId,
  leadUserId: t.leadUserId,
});
