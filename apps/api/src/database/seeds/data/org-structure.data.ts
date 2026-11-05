/** Arweqah Alreyadah's organization structure, from the owner's sheet `arweqah_org_structure.csv` (parent is written by name). */
export type OrgKind = 'sector' | 'department' | 'section' | 'unit';

export interface OrgRow {
  kind: OrgKind;
  ar: string;
  en: string;
  /** Arabic name of the parent one level up; null for a sector. */
  parent: string | null;
  /** The grade and track of the unit's title, when the source has them (the owner's sheet has none, so none is invented; the official titles file gives them). */
  title?: { grade: number; track: 'M' | 'P' | 'J' | 'C' | 'S' };
}

const s = (ar: string, en: string): OrgRow => ({ kind: 'sector', ar, en, parent: null });
const d = (ar: string, en: string, parent: string): OrgRow => ({ kind: 'department', ar, en, parent });
const c = (ar: string, en: string, parent: string): OrgRow => ({ kind: 'section', ar, en, parent });
const u = (ar: string, en: string, parent: string): OrgRow => ({ kind: 'unit', ar, en, parent });

export const ORG_STRUCTURE: OrgRow[] = [
  s('إدارة الاستراتيجية والحوكمة', 'Strategy and Governance'),
  d('إدارة الاستراتيجية والحوكمة', 'Strategy and Governance Department', 'إدارة الاستراتيجية والحوكمة'),
  s('إدارة التواصل المؤسسي', 'Corporate Communication'),
  d('إدارة التواصل المؤسسي', 'Corporate Communication Department', 'إدارة التواصل المؤسسي'),
  c('قسم الاتصال الداخلي والثقافة', 'Internal Communication and Culture Section', 'إدارة التواصل المؤسسي'),
  c('قسم التسويق والعلاقات العامة', 'Marketing and Public Relations Section', 'إدارة التواصل المؤسسي'),
  u('وحدة التسويق', 'Marketing Unit', 'قسم التسويق والعلاقات العامة'),
  u('وحدة العلاقات العامة', 'Public Relations Unit', 'قسم التسويق والعلاقات العامة'),
  u('وحدة المحتوى والإنتاج الإبداعي', 'Content and Creative Production Unit', 'قسم التسويق والعلاقات العامة'),
  u('وحدة علاقات العملاء وأصحاب المصلحة', 'Client and Stakeholder Relations Unit', 'قسم التسويق والعلاقات العامة'),
  s('المكتب التنفيذي', 'Executive Office'),
  d('مكتب الرئيس التنفيذي', 'CEO Office', 'المكتب التنفيذي'),
  s('قطاع الأعمال والاستشارات', 'Business and Consulting Sector'),
  d('إدارة الاستشارات', 'Consulting Department', 'قطاع الأعمال والاستشارات'),
  d('إدارة التدريب وبناء القدرات', 'Training and Capacity Building Department', 'قطاع الأعمال والاستشارات'),
  d('إدارة المعرفة والدراسات', 'Knowledge and Studies Department', 'قطاع الأعمال والاستشارات'),
  d('إدارة المنهجيات والجودة الفنية', 'Methodologies and Technical Quality Department', 'قطاع الأعمال والاستشارات'),
  d('إدارة تقييم الأسواق والمبادرات', 'Market and Initiative Assessment Department', 'قطاع الأعمال والاستشارات'),
  d('مكتب قطاع الأعمال والاستشارات', 'Business and Consulting Sector Office', 'قطاع الأعمال والاستشارات'),
  s('قطاع الاستثمارات والشركات التابعة', 'Investments and Subsidiaries Sector'),
  s('قطاع التشغيل وتقديم الخدمات', 'Operations and Service Delivery Sector'),
  d('إدارة التشغيل', 'Operations Department', 'قطاع التشغيل وتقديم الخدمات'),
  c('قسم التوريد الاستراتيجي', 'Strategic Sourcing Section', 'إدارة التشغيل'),
  u('وحدة الرعايات', 'Sponsorships Unit', 'قسم التوريد الاستراتيجي'),
  u('وحدة الشراكات', 'Partnerships Unit', 'قسم التوريد الاستراتيجي'),
  u('وحدة المشتريات', 'Procurement Unit', 'قسم التوريد الاستراتيجي'),
  c('قسم العمليات الميدانية', 'Field Operations Section', 'إدارة التشغيل'),
  u('وحدة التنفيذ الميداني', 'Field Execution Unit', 'قسم العمليات الميدانية'),
  u('وحدة الجودة والامتثال', 'Quality and Compliance Unit', 'قسم العمليات الميدانية'),
  u('وحدة اللوجستيات والمستودعات', 'Logistics and Warehouses Unit', 'قسم العمليات الميدانية'),
  c('قسم تطوير أعمال المستفيدين', 'Beneficiary Business Development Section', 'إدارة التشغيل'),
  u('وحدة التدريب وبناء القدرات', 'Training and Capacity Building Unit', 'قسم تطوير أعمال المستفيدين'),
  u('وحدة التوجيه والإرشاد', 'Mentoring and Guidance Unit', 'قسم تطوير أعمال المستفيدين'),
  u('وحدة الربط والوصول للسوق', 'Market Linkage and Access Unit', 'قسم تطوير أعمال المستفيدين'),
  u('وحدة حلول وخدمات الأعمال', 'Business Solutions and Services Unit', 'قسم تطوير أعمال المستفيدين'),
  c('قسم رحلة المستفيد', 'Beneficiary Journey Section', 'إدارة التشغيل'),
  u('وحدة إدارة المستفيدين', 'Beneficiary Management Unit', 'قسم رحلة المستفيد'),
  u('وحدة الاستقطاب', 'Outreach Unit', 'قسم رحلة المستفيد'),
  d('إدارة الخدمات المشتركة', 'Shared Services Department', 'قطاع التشغيل وتقديم الخدمات'),
  c('قسم التقنية', 'Technology Section', 'إدارة الخدمات المشتركة'),
  u('وحدة البنية التحتية والدعم التقني', 'Infrastructure and Technical Support Unit', 'قسم التقنية'),
  u('وحدة التحول والحلول الرقمية', 'Digital Transformation and Solutions Unit', 'قسم التقنية'),
  u('وحدة التصاميم', 'Design Unit', 'قسم التقنية'),
  u('وحدة المنتجات والحلول التقنية', 'Technical Products and Solutions Unit', 'قسم التقنية'),
  c('قسم المالية', 'Finance Section', 'إدارة الخدمات المشتركة'),
  u('وحدة التخطيط والتحليل المالي', 'Financial Planning and Analysis Unit', 'قسم المالية'),
  u('وحدة الخزينة', 'Treasury Unit', 'قسم المالية'),
  u('وحدة المحاسبة والتقارير المالية', 'Accounting and Financial Reporting Unit', 'قسم المالية'),
  c('قسم الموارد البشرية والخدمات الإدارية', 'Human Resources and Administrative Services Section', 'إدارة الخدمات المشتركة'),
  u('وحدة إدارة المرافق', 'Facilities Management Unit', 'قسم الموارد البشرية والخدمات الإدارية'),
  u('وحدة الاستقطاب وإدارة المواهب', 'Talent Acquisition and Management Unit', 'قسم الموارد البشرية والخدمات الإدارية'),
  u('وحدة التطوير التنظيمي', 'Organizational Development Unit', 'قسم الموارد البشرية والخدمات الإدارية'),
  u('وحدة العمليات والشؤون الحكومية', 'Operations and Government Affairs Unit', 'قسم الموارد البشرية والخدمات الإدارية'),
  d('إدارة المشاريع', 'Projects Department', 'قطاع التشغيل وتقديم الخدمات'),
  c('قسم تمكين المشاريع', 'Project Enablement Section', 'إدارة المشاريع'),
  u('وحدة دعم المشاريع', 'Project Support Unit', 'قسم تمكين المشاريع'),
  u('وحدة ضبط المشاريع', 'Project Control Unit', 'قسم تمكين المشاريع'),
  c('قسم تنفيذ المشاريع', 'Project Execution Section', 'إدارة المشاريع'),
  u('محفظة التمكين والتنمية', 'Empowerment and Development Portfolio', 'قسم تنفيذ المشاريع'),
  u('محفظة الريادة والابتكار', 'Entrepreneurship and Innovation Portfolio', 'قسم تنفيذ المشاريع'),
  u('محفظة القطاع غير الربحي والتمكين المنظومي', 'Non-Profit Sector and Ecosystem Enablement Portfolio', 'قسم تنفيذ المشاريع'),
  d('مكتب قطاع التشغيل وتقديم الخدمات', 'Operations and Service Delivery Sector Office', 'قطاع التشغيل وتقديم الخدمات'),
  c('قسم الأداء والتميز التشغيلي', 'Performance and Operational Excellence Section', 'مكتب قطاع التشغيل وتقديم الخدمات'),
  s('قطاع النمو وتطوير الأعمال', 'Growth and Business Development Sector'),
  d('إدارة الشراكات وعلاقات العملاء', 'Partnerships and Client Relations Department', 'قطاع النمو وتطوير الأعمال'),
  d('إدارة المنتجات والخدمات', 'Products and Services Department', 'قطاع النمو وتطوير الأعمال'),
  d('إدارة تطوير الأعمال', 'Business Development Department', 'قطاع النمو وتطوير الأعمال'),
  d('مكتب قطاع النمو وتطوير الأعمال', 'Growth and Business Development Sector Office', 'قطاع النمو وتطوير الأعمال'),
];
