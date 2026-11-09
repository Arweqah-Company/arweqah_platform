/** The platform's roles, from the owner's list (the number of permissions of each role is not known yet, so none is granted). */
export interface RoleSeed {
  ar: string;
  en: string;
  assignment: 'auto' | 'manual';
  note?: string;
  autoRule?: 'everyone' | 'has_reports' | 'limited_access';
}

const auto = (ar: string, en: string, extra: Partial<RoleSeed> = {}): RoleSeed => ({ ar, en, assignment: 'auto', ...extra });
const manual = (ar: string, en: string, extra: Partial<RoleSeed> = {}): RoleSeed => ({ ar, en, assignment: 'manual', ...extra });

/** "Employee" (موظف) is the seeded system role; the others are created once, when no custom role exists yet. */
export const EMPLOYEE_ROLE_SEED = { assignment: 'auto', autoRule: 'everyone', note: 'يُسند للجميع من الهيكل' } as const;

/**
 * Roles the platform needs to exist whatever the state of the list above: made once when missing (by Arabic name), with these keys, and never touched
 * again, so an administrator can change them. The reviewer of the career-path certificates (FR-114).
 */
export const ENSURED_ROLES: { ar: string; en: string; note: string; keys: readonly string[] }[] = [
  {
    ar: 'مسؤول تطوير الموظفين', en: 'Employee development officer', note: 'يراجع شهادات التعلم ويعتمدها',
    keys: ['career_certificates.review', 'career_certificates.approve', 'career_certificates.reject', 'career_certificates.refer', 'career_certificates.export'],
  },
];

export const ROLE_SEEDS: RoleSeed[] = [
  auto('مدير مباشر', 'Direct manager', { autoRule: 'has_reports', note: 'يُسند لمن له مرؤوسون' }),
  auto('مستقبِل تذاكر الوحدة', 'Unit ticket receiver'),
  auto('مسؤول تذاكر الوحدة', 'Unit ticket owner'),
  auto('مسؤول فئات الوحدة', 'Unit tags owner'),
  auto('مطوّر فرص', 'Opportunity developer'),
  auto('مسؤول علاقات', 'Relations officer'),
  manual('قارئ كل الفرص', 'All-opportunities reader'),
  manual('مستورد الجهات', 'Entities importer'),
  manual('مؤكد التجديد', 'Renewal confirmer'),
  manual('مالية الفرص', 'Opportunity finance'),
  auto('قارئ تكلفة العروض', 'Offer cost reader'),
  manual('تنفيذي', 'Executive'),
  manual('موارد بشرية — قراءة', 'HR — read'),
  manual('موارد بشرية — عمليات', 'HR — operations'),
  manual('موارد بشرية — رواتب', 'HR — payroll', { note: 'بيانات حساسة' }),
  manual('مدير الموارد البشرية', 'HR manager', { note: 'بيانات حساسة' }),
  manual('مدير المنصة', 'Platform manager'),
  manual('مجرّب مبكر', 'Early tester'),
  manual('مهيّئ المنصة', 'Platform configurator'),
  manual('مدقق المنصة', 'Platform auditor'),
  manual('مطّلع الاستثناء على المهام', 'Task exception viewer'),
  auto('مدير المشروع', 'Project manager'),
  auto('نائب مدير المشروع', 'Deputy project manager'),
  auto('رئيس الوحدة المنفذة', 'Executing unit head'),
  auto('عضو فريق المشروع', 'Project team member'),
  auto('مدير قطاع التشغيل وتقديم الخدمات ومدير إدارة المشاريع', 'Operations and service delivery sector manager and projects department manager'),
  manual('رئيس قسم المالية', 'Head of the finance section'),
];
