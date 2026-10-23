/** Seeded option lists, reviewed in docs/plans/phase-1-auth-employees.md §4.8 (Arabic ⇄ English). */
export interface SeedName {
  code: string;
  ar: string;
  en: string;
}

export const RELATION_TYPES: SeedName[] = [
  { code: 'employee', ar: 'موظف', en: 'Employee' },
  { code: 'collaborator', ar: 'متعاون', en: 'Collaborator' },
];

export const MARITAL_STATUSES: SeedName[] = [
  { code: 'single', ar: 'أعزب', en: 'Single' },
  { code: 'married', ar: 'متزوج', en: 'Married' },
  { code: 'divorced', ar: 'مطلق', en: 'Divorced' },
  { code: 'widowed', ar: 'أرمل', en: 'Widowed' },
];

export const RESIDENCY_STATUSES: SeedName[] = [
  { code: 'citizen', ar: 'مواطن', en: 'Citizen' },
  { code: 'resident', ar: 'مقيم', en: 'Resident' },
  { code: 'citizen_spouse', ar: 'زوج/ة مواطن/ة', en: 'Spouse of a Citizen' },
  { code: 'premium_residency', ar: 'إقامة مميزة', en: 'Premium Residency' },
  { code: 'citizen_child', ar: 'ابن/ة مواطن/ة', en: 'Child of a Citizen' },
];

export interface IdTypeSeed extends SeedName {
  requiresCountry: boolean;
  rule: { regex: string; minLength: number; maxLength: number; checksum?: 'luhn'; messageAr: string; messageEn: string };
}

/** Rules are lenient where the official format is not confirmed yet (border number, passport, home-country and GCC IDs). */
export const ID_TYPES: IdTypeSeed[] = [
  {
    code: 'national_id', ar: 'هوية وطنية', en: 'National ID', requiresCountry: false,
    rule: { regex: '^1\\d{9}$', minLength: 10, maxLength: 10, checksum: 'luhn', messageAr: 'رقم الهوية الوطنية غير صالح: 10 أرقام تبدأ بالرقم 1 ورقم تحقق صحيح', messageEn: 'Invalid National ID: 10 digits starting with 1 and a valid check digit' },
  },
  {
    code: 'iqama', ar: 'إقامة', en: 'Iqama (Residence Permit)', requiresCountry: false,
    rule: { regex: '^2\\d{9}$', minLength: 10, maxLength: 10, checksum: 'luhn', messageAr: 'رقم الإقامة غير صالح: 10 أرقام تبدأ بالرقم 2 ورقم تحقق صحيح', messageEn: 'Invalid iqama number: 10 digits starting with 2 and a valid check digit' },
  },
  {
    code: 'home_country_id', ar: 'هوية بلده', en: 'Home-Country ID', requiresCountry: true,
    rule: { regex: '^[A-Za-z0-9-]{5,20}$', minLength: 5, maxLength: 20, messageAr: 'رقم الهوية غير صالح (5 إلى 20 حرفًا أو رقمًا)', messageEn: 'Invalid ID number (5 to 20 letters or digits)' },
  },
  {
    code: 'passport', ar: 'جواز سفر', en: 'Passport', requiresCountry: false,
    rule: { regex: '^[A-Za-z0-9]{6,12}$', minLength: 6, maxLength: 12, messageAr: 'رقم جواز السفر غير صالح (6 إلى 12 حرفًا أو رقمًا)', messageEn: 'Invalid passport number (6 to 12 letters or digits)' },
  },
  {
    code: 'border_number', ar: 'رقم حدود', en: 'Border Number', requiresCountry: false,
    rule: { regex: '^\\d{10}$', minLength: 10, maxLength: 10, messageAr: 'رقم الحدود يتكون من 10 أرقام', messageEn: 'Border number must be 10 digits' },
  },
  {
    code: 'gcc_id', ar: 'هوية خليجية', en: 'GCC National ID', requiresCountry: true,
    rule: { regex: '^[A-Za-z0-9-]{6,20}$', minLength: 6, maxLength: 20, messageAr: 'رقم الهوية الخليجية غير صالح (6 إلى 20 حرفًا أو رقمًا)', messageEn: 'Invalid GCC ID number (6 to 20 letters or digits)' },
  },
];

export interface ContractTypeSeed extends SeedName {
  requiresEndDate: boolean;
  isOther: boolean;
}

export const CONTRACT_TYPES: ContractTypeSeed[] = [
  { code: 'fixed_term', ar: 'محدد المدة', en: 'Fixed-Term', requiresEndDate: true, isOther: false },
  { code: 'indefinite_term', ar: 'غير محدد المدة', en: 'Indefinite-Term', requiresEndDate: false, isOther: false },
  { code: 'project', ar: 'عقد مشروع', en: 'Project Contract', requiresEndDate: true, isOther: false },
  { code: 'training', ar: 'تدريب/تمهير', en: 'Training / Tamheer', requiresEndDate: true, isOther: false },
  { code: 'other', ar: 'أخرى', en: 'Other', requiresEndDate: false, isOther: true },
];

export const GOSI_SYSTEMS: SeedName[] = [
  { code: 'old_system', ar: 'النظام القديم', en: 'Old System' },
  { code: 'new_system', ar: 'النظام الجديد', en: 'New System' },
];

export const TERMINATION_REASONS: (SeedName & { isOther: boolean })[] = [
  { code: 'resignation', ar: 'استقالة', en: 'Resignation', isOther: false },
  { code: 'termination', ar: 'إنهاء', en: 'Termination', isOther: false },
  { code: 'transfer', ar: 'نقل', en: 'Transfer', isOther: false },
  { code: 'retirement', ar: 'تقاعد', en: 'Retirement', isOther: false },
  { code: 'death', ar: 'وفاة', en: 'Death', isOther: false },
  { code: 'other', ar: 'أخرى', en: 'Other', isOther: true },
];

/** One template for every company for now: sector, department, section, unit (only the unit takes employees). */
export const ORG_LEVEL_TEMPLATE: (SeedName & { isAssignable: boolean })[] = [
  { code: 'sector', ar: 'قطاع', en: 'Sector', isAssignable: false },
  { code: 'department', ar: 'إدارة', en: 'Department', isAssignable: false },
  { code: 'section', ar: 'قسم', en: 'Section', isAssignable: false },
  { code: 'unit', ar: 'وحدة', en: 'Unit', isAssignable: true },
];

/** The group's companies. English names and codes are proposals until the official spelling is confirmed. */
export const COMPANIES: SeedName[] = [
  { code: 'TDW', ar: 'تدويم', en: 'Tadweem' },
  { code: 'BYD', ar: 'بأيدينا', en: 'Bi-Aydina' },
  { code: 'ARW', ar: 'أروقة الريادة', en: 'Arweqah Alreyadah' },
  { code: 'SJM', ar: 'سجوم مصر', en: 'Sojoum Misr' },
  { code: 'LDN', ar: 'لدن', en: 'Ladun' },
  { code: 'ISA', ar: 'استدامة الأثر', en: 'Istidamat Al-Athar' },
  { code: 'HKN', ar: 'حكينا', en: 'Hakeena' },
  { code: 'ATH', ar: 'أثلاث', en: 'Athlath' },
  { code: 'AAW', ar: 'عبدالعزيز العواد', en: 'Abdulaziz Al-Awad' },
  { code: 'RHF', ar: 'رواد الحرف', en: 'Rowad Al-Hiraf' },
];

export const DEFAULT_COMPANY_CODE = 'ARW';
