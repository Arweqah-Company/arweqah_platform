import type { JobTitleCardDto, JobTitleListItemDto, TitleChainStepDto } from '@arweqah-platform/shared';

const EMPTY = { ar: [], en: [] };

/** A card with a code, a grade, a stage and holders in two companies; a test overrides what it cares about. */
export const titleCard = (over: Partial<JobTitleCardDto> = {}): JobTitleCardDto => ({
  id: 't1',
  code: 'OPS.03.03.01-L7P-01',
  codeParts: { unitCode: 'OPS.03.03.01', grade: 7, track: 'P', sequence: 1 },
  nameAr: 'محاسب',
  nameEn: 'Accountant',
  isActive: true,
  unit: { id: 'u1', code: 'OPS.03.03.01', nameAr: 'وحدة الحسابات', nameEn: 'Accounts unit', pathAr: 'قطاع التشغيل / وحدة الحسابات', pathEn: 'Operations / Accounts unit', effectiveMode: 'shared' },
  grade: 7,
  track: 'P',
  developmentStage: { code: 'specialization', hoursPerYear: 48, budgetCap: 5000 },
  developmentStageReason: null,
  reportsTo: { id: 't2', code: 'OPS.03.03.01-L5M-01', nameAr: 'رئيس الحسابات', nameEn: 'Head of accounts' },
  responsibilities: EMPTY,
  qualifications: EMPTY,
  kpis: EMPTY,
  contentVersion: 1,
  occupants: [{ companyId: 'c1', companyNameAr: 'أروقة الريادة', companyNameEn: 'Arweqah', count: 3 }, { companyId: 'c2', companyNameAr: 'لدن', companyNameEn: 'Ladun', count: 1 }],
  chain: { companyId: 'c1', managerTitleId: null, steps: [] },
  ...over,
});

export const step = (over: Partial<TitleChainStepDto> = {}): TitleChainStepDto => ({
  id: 's1',
  code: 'OPS.03.03.01-L6P-01',
  nameAr: 'محاسب أول',
  nameEn: 'Senior accountant',
  state: 'vacant',
  unitNameAr: 'وحدة الحسابات',
  unitNameEn: 'Accounts unit',
  count: null,
  managerEmployeeId: null,
  managerName: null,
  ...over,
});

/** A row of the job-titles list. */
export const listItem = (over: Partial<JobTitleListItemDto> = {}): JobTitleListItemDto => ({
  id: 't1',
  code: 'OPS.03.03.01-L7P-01',
  nameAr: 'محاسب',
  nameEn: 'Accountant',
  isActive: true,
  orgNodeId: 'u1',
  unitCode: 'OPS.03.03.01',
  unitNameAr: 'وحدة الحسابات',
  unitNameEn: 'Accounts unit',
  unitPathAr: 'قطاع التشغيل / وحدة الحسابات',
  unitPathEn: 'Operations / Accounts unit',
  grade: 7,
  track: 'P',
  reportsToTitleId: null,
  occupants: 3,
  ...over,
});
