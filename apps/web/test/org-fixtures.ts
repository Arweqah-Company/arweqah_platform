import { DEFAULT_PARENT_RULES, type OrgCharter, type OrgLevelDto, type OrgLevelsDto, type OrgNodeLeaderDto, type OrgNodeLeadersDto, type OrgNodeVersionDto, type OrgNodeVersionsDto, type OrgTreeDto, type OrgTreeNodeDto } from '@arweqah-platform/shared';

const TYPES: [string, string, string, boolean, number | null][] = [
  ['sector', 'قطاع', 'Sector', false, 1],
  ['department', 'إدارة', 'Department', true, 2],
  ['section', 'قسم', 'Section', true, 3],
  ['unit', 'وحدة', 'Unit', true, 4],
  ['office', 'مكتب', 'Office', true, null],
];

/** The five built-in unit types of the group structure, with ids `lv-<key>`. */
export const levels: OrgLevelDto[] = TYPES.map(([key, nameAr, nameEn, acceptsTitles, codeSlot], index) => ({ id: `lv-${key}`, key, nameAr, nameEn, sortOrder: index + 1, acceptsTitles, isBuiltIn: true, tone: key, codeSlot, unitsCount: 1 }));

/** What `GET /org/levels` answers: the types and the default «who may be created under whom» table. */
export const levelsDto: OrgLevelsDto = { levels, rules: Object.fromEntries(Object.entries(DEFAULT_PARENT_RULES).map(([k, v]) => [k, [...v]])) };

/** A unit of the tree the page reads, with sensible defaults; a test overrides what it cares about. */
export const treeNode = (id: string, levelKey: string, parentId: string | null, nameAr: string, extra: Partial<OrgTreeNodeDto> = {}): OrgTreeNodeDto => ({
  id,
  parentId,
  levelId: `lv-${levelKey}`,
  levelKey,
  code: null,
  nameAr,
  nameEn: nameAr,
  managementMode: null,
  effectiveMode: 'per_company',
  isActive: true,
  startDate: '2024-01-01',
  managerId: null,
  managerName: null,
  staffCount: 1,
  subtreeStaffCount: 1,
  staffByCompany: null,
  titles: [],
  visibleForCompany: null,
  hasNoLeader: false,
  hasScheduledChange: false,
  leaders: [],
  ...extra,
});

export const N = { sector: 'n-sector', dept: 'n-dept', section: 'n-section', unit: 'n-unit', office: 'n-office', legacy: 'n-legacy' } as const;

/** A sector (per company) with an office, and under it a shared department with a section and a unit; one older unit has no code yet. */
export const orgNodes: OrgTreeNodeDto[] = [
  treeNode(N.sector, 'sector', null, 'قطاع التشغيل', { code: 'OPS.00.00.00', managementMode: 'per_company', staffCount: 0, subtreeStaffCount: 6 }),
  treeNode(N.office, 'office', N.sector, 'مكتب قطاع التشغيل', { code: 'OPS.09.00.00', managerName: 'خالد', staffCount: 1, subtreeStaffCount: 1 }),
  treeNode(N.dept, 'department', N.sector, 'إدارة الخدمات المشتركة', { code: 'OPS.03.00.00', managementMode: 'shared', effectiveMode: 'shared', staffCount: 1, subtreeStaffCount: 4 }),
  treeNode(N.section, 'section', N.dept, 'قسم الموارد البشرية', { code: 'OPS.03.01.00', effectiveMode: 'shared', staffCount: 1, subtreeStaffCount: 3, titles: [{ id: 't1', orgNodeId: N.section, nameAr: 'أخصائي موارد', nameEn: 'HR specialist', isActive: true, employeesCount: 2, code: null, grade: null, track: null, reportsToTitleId: null, contentVersion: 1 }] }),
  treeNode(N.unit, 'unit', N.section, 'وحدة التوظيف', { code: 'OPS.03.01.01', effectiveMode: 'shared', staffCount: 2, subtreeStaffCount: 2 }),
  treeNode(N.legacy, 'unit', N.sector, 'وحدة قديمة', { staffCount: 1, subtreeStaffCount: 1, hasNoLeader: true }),
];

export const orgTree = (extra: Partial<OrgTreeDto> = {}): OrgTreeDto => ({ view: 'team', companyId: 'c1', levels, rules: levelsDto.rules, nodes: orgNodes, hiddenCount: 0, noLeader: [], ...extra });

/** The group company of the structure fixtures. */
export const GROUP_COMPANY = 'company-1';

const leaderRow = (over: Partial<OrgNodeLeaderDto> = {}): OrgNodeLeaderDto => ({
  id: 'l1',
  nodeId: N.section,
  companyId: GROUP_COMPANY,
  companyNameAr: 'أروقة الريادة',
  companyNameEn: 'Arweqah Alreyadah',
  employeeId: 'e1',
  employeeName: 'خالد العتيبي',
  kind: 'leader',
  validFrom: '2024-01-01',
  validTo: null,
  status: 'current',
  reason: 'التأسيس',
  ...over,
});
export { leaderRow };

/** What `GET /org/nodes/:id/leaders` answers: a shared unit led from the group company, unless a test changes it. */
export const leadersDto = (over: Partial<OrgNodeLeadersDto> = {}): OrgNodeLeadersDto => {
  const leader = leaderRow();
  return {
    nodeId: N.section,
    effectiveMode: 'shared',
    groupCompanyId: GROUP_COMPANY,
    items: [leader],
    companies: [{ companyId: GROUP_COMPANY, nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah', staffCount: 2, leader, acting: null, escalatesTo: null }],
    ...over,
  };
};

const version = (over: Partial<OrgNodeVersionDto> = {}): OrgNodeVersionDto => ({
  id: 'v1',
  validFrom: '2024-01-01',
  validTo: null,
  status: 'current',
  nameAr: 'قسم الموارد البشرية',
  nameEn: 'Human resources section',
  code: 'OPS.03.01.00',
  isActive: true,
  charter: null,
  reason: 'التأسيس',
  createdByName: 'سارة أحمد',
  createdAt: '2024-01-01T08:00:00Z',
  ...over,
});
export { version };

/** What `GET /org/nodes/:id/versions` answers: one current version, no charter, no log. */
export const versionsDto = (over: Partial<OrgNodeVersionsDto> = {}): OrgNodeVersionsDto => ({ nodeId: N.section, charter: null, versions: [version()], log: [], ...over });

export const sampleCharter = (): OrgCharter => ({
  purpose: { ar: 'تمكين الموظفين من أداء أعمالهم', en: 'Enable employees to do their work' },
  outputs: { ar: ['سياسات الموارد البشرية', 'تقارير الأداء'], en: ['HR policies', 'Performance reports'] },
  inScope: { ar: ['التوظيف'], en: ['Recruitment'] },
  outOfScope: { ar: ['الرواتب'], en: ['Payroll'] },
  limits: { ar: ['ميزانية سنوية ثابتة'], en: ['A fixed yearly budget'] },
});
