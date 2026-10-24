import type { OrgLevelDto, OrgNodeDto } from '@arweqah-platform/shared';

export const level = (id: string, sortOrder: number, nameAr: string, nameEn: string): OrgLevelDto => ({ id, companyId: 'c1', sortOrder, nameAr, nameEn, isAssignable: sortOrder === 2, templateCode: null, unitsCount: 1 });
export const node = (id: string, levelId: string, parentId: string | null, nameAr: string): OrgNodeDto => ({ id, companyId: 'c1', levelId, parentId, nameAr, nameEn: nameAr, pathAr: nameAr, pathEn: nameAr, managerId: null, managerName: null, startDate: '2024-01-01', isActive: true, employeesCount: 0, jobTitles: [] });
export const orgTree = { companyId: 'c1', levels: [level('l1', 1, 'قطاع', 'Sector'), level('l2', 2, 'إدارة', 'Department')], nodes: [node('n1', 'l1', null, 'قطاع الخدمات'), node('n2', 'l2', 'n1', 'إدارة التدريب')] };
