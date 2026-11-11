/**
 * Arweqah Alreyadah's organization structure with every job title, from the owner's official file `docs/organizational_structure.md` (the sheet «المسميات الوظيفية الجديدة», updated 2026-11-11)
 * (sector → department → section → unit; a sector or department office sits beside its departments; communication, strategy and the CEO
 * office sit directly under the group). Titles carry the grade and track of the file's code (`L7P` = grade 7, track P), so the platform builds
 * `<unit code>-L7P-01` itself; the three-letter prefix of a top unit is the file's (GRW, OPS, BUS, COM, STR, EXE).
 */
export type OrgKind = 'sector' | 'department' | 'section' | 'unit' | 'office';
export type SeedTrack = 'M' | 'P' | 'J' | 'C' | 'S';

export interface SeedTitle {
  ar: string;
  en: string;
  grade: number;
  track: SeedTrack;
}

export interface OrgSeedNode {
  kind: OrgKind;
  ar: string;
  en: string;
  /** Only on a top unit (a sector, or a department / office directly under the group): the first three letters of its codes. */
  prefix?: string;
  titles: SeedTitle[];
  children: OrgSeedNode[];
}

const t = (ar: string, en: string, grade: number, track: SeedTrack): SeedTitle => ({ ar, en, grade, track });

/** `kind(ar, en, titles, children?)`. */
function make(kind: OrgKind) {
  return (ar: string, en: string, titles: SeedTitle[] = [], children: OrgSeedNode[] = []): OrgSeedNode => ({ kind, ar, en, titles, children });
}
/** A top unit (a sector, or a department / office directly under the group) with the first three letters of its codes. */
const top = (prefix: string, node: OrgSeedNode): OrgSeedNode => ({ ...node, prefix });
const sector = make('sector');
const department = make('department');
const section = make('section');
const unit = make('unit');
const office = make('office');

export const ORG_STRUCTURE: OrgSeedNode[] = [
  top('GRW',
      sector('قطاع النمو وتطوير الأعمال', 'Growth & Business Development Sector', [], [
        department('إدارة تطوير الأعمال', 'Business Development Department', [
          t('مدير إدارة تطوير الأعمال', 'Business Development Department Manager', 3, 'M'),
          t('أخصائي أول تطوير الأعمال', 'Senior Business Development Specialist', 6, 'P'),
          t('أخصائي تطوير الأعمال', 'Business Development Specialist', 7, 'P'),
          t('محلل أعمال', 'Business Analyst', 7, 'P'),
        ]),
        department('إدارة المنتجات والخدمات', 'Products & Services Department', [
          t('مدير إدارة المنتجات والخدمات', 'Products & Services Department Manager', 3, 'M'),
          t('أخصائي أول منتجات وخدمات', 'Senior Products & Services Specialist', 6, 'P'),
          t('أخصائي منتجات وخدمات', 'Products & Services Specialist', 7, 'P'),
          t('منسق منتجات وخدمات', 'Products & Services Coordinator', 9, 'P'),
        ]),
        department('إدارة الشراكات وعلاقات العملاء', 'Partnerships & Client Relations Department', [
          t('مدير إدارة الشراكات وعلاقات العملاء', 'Partnerships & Client Relations Department Manager', 3, 'M'),
          t('أخصائي أول الشراكات وعلاقات العملاء', 'Senior Partnerships & Client Relations Specialist', 6, 'P'),
          t('أخصائي الشراكات وعلاقات العملاء', 'Partnerships & Client Relations Specialist', 7, 'P'),
          t('منسق الشراكات وعلاقات العملاء', 'Partnerships & Client Relations Coordinator', 9, 'P'),
        ]),
        office('مكتب قطاع النمو وتطوير الأعمال', 'Growth & Business Development Sector Office', [
          t('مدير قطاع النمو وتطوير الأعمال', 'Growth & Business Development Sector Director', 2, 'M'),
          t('مساعد إداري — قطاع النمو', 'Administrative Assistant — Growth Sector', 8, 'S'),
          t('اخصائي شؤون ادارية — قطاع النمو', 'Administrative Affairs Specialist — Growth Sector', 8, 'S'),
        ]),
      ])),
  top('OPS',
      sector('قطاع التشغيل وتقديم الخدمات', 'Operations & Service Delivery Sector', [], [
        department('إدارة التشغيل', 'Operations Department', [
          t('مدير إدارة التشغيل', 'Operations Department Manager', 3, 'M'),
        ], [
          section('قسم رحلة المستفيد', 'Beneficiary Journey Section', [
            t('رئيس قسم رحلة المستفيد', 'Beneficiary Journey Section Head', 4, 'M'),
          ], [
            unit('وحدة الاستقطاب', 'Beneficiary Outreach Unit', [
              t('رئيس وحدة الاستقطاب', 'Beneficiary Outreach Unit Head', 5, 'M'),
              t('قائد فريق الاستقطاب', 'Beneficiary Outreach Team Lead', 6, 'M'),
              t('أخصائي أول الاستقطاب', 'Senior Beneficiary Outreach Specialist', 6, 'P'),
              t('أخصائي الاستقطاب', 'Beneficiary Outreach Specialist', 7, 'P'),
              t('منسق الاستقطاب', 'Beneficiary Outreach Coordinator', 9, 'P'),
            ]),
            unit('وحدة إدارة المستفيدين', 'Beneficiary Management Unit', [
              t('رئيس وحدة إدارة المستفيدين', 'Beneficiary Management Unit Head', 5, 'M'),
              t('قائد فريق إدارة المستفيدين', 'Beneficiary Management Team Lead', 6, 'M'),
              t('أخصائي أول إدارة المستفيدين', 'Senior Beneficiary Management Specialist', 6, 'P'),
              t('أخصائي إدارة المستفيدين', 'Beneficiary Management Specialist', 7, 'P'),
              t('منسق إدارة المستفيدين', 'Beneficiary Management Coordinator', 9, 'P'),
            ]),
          ]),
          section('قسم تطوير أعمال المستفيدين', 'Beneficiary Business Development Section', [
            t('رئيس قسم تطوير أعمال المستفيدين', 'Beneficiary Business Development Section Head', 4, 'M'),
          ], [
            unit('وحدة التدريب وبناء القدرات', 'Training & Capacity Building Unit', [
              t('رئيس وحدة التدريب وبناء القدرات', 'Training & Capacity Building Unit Head', 5, 'M'),
              t('قائد فريق التدريب وبناء القدرات', 'Training & Capacity Building Team Lead', 6, 'M'),
              t('أخصائي أول التدريب وبناء القدرات', 'Senior Training & Capacity Building Specialist', 6, 'P'),
              t('أخصائي التدريب وبناء القدرات', 'Training & Capacity Building Specialist', 7, 'P'),
              t('منسق التدريب وبناء القدرات', 'Training & Capacity Building Coordinator', 9, 'P'),
            ]),
            unit('وحدة التوجيه والإرشاد', 'Mentoring & Guidance Unit', [
              t('رئيس وحدة التوجيه والإرشاد', 'Mentoring & Guidance Unit Head', 5, 'M'),
              t('قائد فريق التوجيه والإرشاد', 'Mentoring & Guidance Team Lead', 6, 'M'),
              t('أخصائي أول التوجيه والإرشاد', 'Senior Mentoring & Guidance Specialist', 6, 'P'),
              t('أخصائي التوجيه والإرشاد', 'Mentoring & Guidance Specialist', 7, 'P'),
              t('منسق التوجيه والإرشاد', 'Mentoring & Guidance Coordinator', 9, 'P'),
            ]),
            unit('وحدة حلول وخدمات الأعمال', 'Business Solutions & Services Unit', [
              t('رئيس وحدة حلول وخدمات الأعمال', 'Business Solutions & Services Unit Head', 5, 'M'),
              t('قائد فريق حلول وخدمات الأعمال', 'Business Solutions & Services Team Lead', 6, 'M'),
              t('أخصائي أول حلول وخدمات الأعمال', 'Senior Business Solutions & Services Specialist', 6, 'P'),
              t('أخصائي حلول وخدمات الأعمال', 'Business Solutions & Services Specialist', 7, 'P'),
              t('منسق حلول وخدمات الأعمال', 'Business Solutions & Services Coordinator', 9, 'P'),
            ]),
            unit('وحدة الربط والوصول للسوق', 'Market Access & Linkages Unit', [
              t('رئيس وحدة الربط والوصول للسوق', 'Market Access & Linkages Unit Head', 5, 'M'),
              t('قائد فريق الربط والوصول للسوق', 'Market Access & Linkages Team Lead', 6, 'M'),
              t('أخصائي أول الربط والوصول للسوق', 'Senior Market Access & Linkages Specialist', 6, 'P'),
              t('أخصائي الربط والوصول للسوق', 'Market Access & Linkages Specialist', 7, 'P'),
              t('منسق الربط والوصول للسوق', 'Market Access & Linkages Coordinator', 9, 'P'),
            ]),
          ]),
          section('قسم العمليات الميدانية', 'Field Operations Section', [
            t('رئيس قسم العمليات الميدانية', 'Field Operations Section Head', 4, 'M'),
          ], [
            unit('وحدة التنفيذ الميداني', 'Field Execution Unit', [
              t('رئيس وحدة التنفيذ الميداني', 'Field Execution Unit Head', 5, 'M'),
              t('قائد فريق التنفيذ الميداني', 'Field Execution Team Lead', 6, 'M'),
              t('أخصائي أول التنفيذ الميداني', 'Senior Field Execution Specialist', 6, 'P'),
              t('أخصائي التنفيذ الميداني', 'Field Execution Specialist', 7, 'P'),
              t('منسق التنفيذ الميداني', 'Field Execution Coordinator', 9, 'P'),
            ]),
            unit('وحدة اللوجستيات والمستودعات', 'Logistics & Warehousing Unit', [
              t('رئيس وحدة اللوجستيات والمستودعات', 'Logistics & Warehousing Unit Head', 5, 'M'),
              t('قائد فريق اللوجستيات والمستودعات', 'Logistics & Warehousing Team Lead', 6, 'M'),
              t('أخصائي أول اللوجستيات والمستودعات', 'Senior Logistics & Warehousing Specialist', 6, 'P'),
              t('أخصائي اللوجستيات والمستودعات', 'Logistics & Warehousing Specialist', 7, 'P'),
              t('منسق اللوجستيات والمستودعات', 'Logistics & Warehousing Coordinator', 9, 'P'),
            ]),
            unit('وحدة الجودة والامتثال', 'Quality & Compliance Unit', [
              t('رئيس وحدة الجودة والامتثال', 'Quality & Compliance Unit Head', 5, 'M'),
              t('قائد فريق الجودة والامتثال', 'Quality & Compliance Team Lead', 6, 'M'),
              t('أخصائي أول الجودة والامتثال', 'Senior Quality & Compliance Specialist', 6, 'P'),
              t('أخصائي الجودة والامتثال', 'Quality & Compliance Specialist', 7, 'P'),
              t('منسق الجودة والامتثال', 'Quality & Compliance Coordinator', 9, 'P'),
            ]),
          ]),
          section('قسم التوريد الاستراتيجي', 'Strategic Sourcing Section', [
            t('رئيس قسم التوريد الاستراتيجي', 'Strategic Sourcing Section Head', 4, 'M'),
          ], [
            unit('وحدة المشتريات', 'Procurement Unit', [
              t('رئيس وحدة المشتريات', 'Procurement Unit Head', 5, 'M'),
              t('قائد فريق المشتريات', 'Procurement Team Lead', 6, 'M'),
              t('أخصائي أول المشتريات', 'Senior Procurement Specialist', 6, 'P'),
              t('أخصائي المشتريات', 'Procurement Specialist', 7, 'P'),
              t('منسق المشتريات', 'Procurement Coordinator', 9, 'P'),
            ]),
            unit('وحدة الشراكات', 'Partnerships Unit', [
              t('رئيس وحدة الشراكات', 'Partnerships Unit Head', 5, 'M'),
              t('قائد فريق الشراكات', 'Partnerships Team Lead', 6, 'M'),
              t('أخصائي أول الشراكات', 'Senior Partnerships Specialist', 6, 'P'),
              t('أخصائي الشراكات', 'Partnerships Specialist', 7, 'P'),
              t('منسق الشراكات', 'Partnerships Coordinator', 9, 'P'),
            ]),
            unit('وحدة الرعايات', 'Sponsorship Unit', [
              t('رئيس وحدة الرعايات', 'Sponsorship Unit Head', 5, 'M'),
              t('قائد فريق الرعايات', 'Sponsorship Team Lead', 6, 'M'),
              t('أخصائي أول الرعايات', 'Senior Sponsorship Specialist', 6, 'P'),
              t('أخصائي الرعايات', 'Sponsorship Specialist', 7, 'P'),
              t('منسق الرعايات', 'Sponsorship Coordinator', 9, 'P'),
            ]),
          ]),
        ]),
        department('إدارة المشاريع', 'Project Management Department', [
          t('مدير إدارة المشاريع', 'Project Management Department Manager', 3, 'M'),
        ], [
          section('قسم تنفيذ المشاريع', 'Project Delivery Section', [], [
            unit('محفظة التمكين والتنمية', 'Empowerment & Development Portfolio', [
              t('مدير محفظة — التمكين والتنمية', 'Portfolio Manager — Empowerment & Development', 4, 'M'),
              t('مدير برنامج — التمكين والتنمية', 'Program Manager — Empowerment & Development', 5, 'J'),
              t('مدير مشروع رئيسي — التمكين والتنمية', 'Principal Project Manager — Empowerment & Development', 5, 'J'),
              t('مدير مشروع أول — التمكين والتنمية', 'Senior Project Manager — Empowerment & Development', 6, 'J'),
              t('مدير تشغيل المحفظة — التمكين والتنمية', 'Portfolio Operations Manager — Empowerment & Development', 6, 'M'),
              t('أخصائي أول تشغيل — التمكين والتنمية', 'Senior Operations Specialist — Empowerment & Development', 6, 'P'),
              t('مشرف تشغيل — التمكين والتنمية', 'Operations Supervisor — Empowerment & Development', 6, 'P'),
              t('مدير مشروع — التمكين والتنمية', 'Project Manager — Empowerment & Development', 7, 'J'),
              t('مدير عمليات — التمكين والتنمية', 'Operations Manager — Empowerment & Development', 7, 'M'),
              t('أخصائي تشغيل — التمكين والتنمية', 'Operations Specialist — Empowerment & Development', 7, 'P'),
              t('مساعد مدير مشروع — التمكين والتنمية', 'Assistant Project Manager — Empowerment & Development', 8, 'S'),
              t('منسق مشروع — التمكين والتنمية', 'Project Coordinator — Empowerment & Development', 9, 'J'),
              t('منسق تشغيل — التمكين والتنمية', 'Operations Coordinator — Empowerment & Development', 9, 'P'),
            ]),
            unit('محفظة الريادة والابتكار', 'Entrepreneurship & Innovation Portfolio', [
              t('مدير محفظة — الريادة والابتكار', 'Portfolio Manager — Entrepreneurship & Innovation', 4, 'M'),
              t('مدير برنامج — الريادة والابتكار', 'Program Manager — Entrepreneurship & Innovation', 5, 'J'),
              t('مدير مشروع رئيسي — الريادة والابتكار', 'Principal Project Manager — Entrepreneurship & Innovation', 5, 'J'),
              t('مدير مشروع أول — الريادة والابتكار', 'Senior Project Manager — Entrepreneurship & Innovation', 6, 'J'),
              t('مدير تشغيل المحفظة — الريادة والابتكار', 'Portfolio Operations Manager — Entrepreneurship & Innovation', 6, 'M'),
              t('مشرف تشغيل — الريادة والابتكار', 'Operations Supervisor — Entrepreneurship & Innovation', 6, 'P'),
              t('أخصائي أول تشغيل — الريادة والابتكار', 'Senior Operations Specialist — Entrepreneurship & Innovation', 6, 'P'),
              t('مدير مشروع — الريادة والابتكار', 'Project Manager — Entrepreneurship & Innovation', 7, 'J'),
              t('مدير عمليات — الريادة والابتكار', 'Operations Manager — Entrepreneurship & Innovation', 7, 'M'),
              t('أخصائي تشغيل — الريادة والابتكار', 'Operations Specialist — Entrepreneurship & Innovation', 7, 'P'),
              t('مساعد مدير مشروع — الريادة والابتكار', 'Assistant Project Manager — Entrepreneurship & Innovation', 8, 'S'),
              t('منسق مشروع — الريادة والابتكار', 'Project Coordinator — Entrepreneurship & Innovation', 9, 'J'),
              t('منسق تشغيل — الريادة والابتكار', 'Operations Coordinator — Entrepreneurship & Innovation', 9, 'P'),
            ]),
            unit('محفظة القطاع غير الربحي والتمكين المنظومي', 'Nonprofit Sector & Ecosystem Empowerment Portfolio', [
              t('مدير محفظة — القطاع غير الربحي والتمكين المنظومي', 'Portfolio Manager — Nonprofit Sector & Ecosystem Empowerment', 4, 'M'),
              t('مدير برنامج — القطاع غير الربحي والتمكين المنظومي', 'Program Manager — Nonprofit Sector & Ecosystem Empowerment', 5, 'J'),
              t('مدير مشروع رئيسي — القطاع غير الربحي والتمكين المنظومي', 'Principal Project Manager — Nonprofit Sector & Ecosystem Empowerment', 5, 'J'),
              t('مدير مشروع أول — القطاع غير الربحي والتمكين المنظومي', 'Senior Project Manager — Nonprofit Sector & Ecosystem Empowerment', 6, 'J'),
              t('مدير تشغيل المحفظة — القطاع غير الربحي والتمكين المنظومي', 'Portfolio Operations Manager — Nonprofit Sector & Ecosystem Empowerment', 6, 'M'),
              t('مشرف تشغيل — القطاع غير الربحي والتمكين المنظومي', 'Operations Supervisor — Nonprofit Sector & Ecosystem Empowerment', 6, 'P'),
              t('أخصائي أول تشغيل — القطاع غير الربحي والتمكين المنظومي', 'Senior Operations Specialist — Nonprofit Sector & Ecosystem Empowerment', 6, 'P'),
              t('مدير مشروع — القطاع غير الربحي والتمكين المنظومي', 'Project Manager — Nonprofit Sector & Ecosystem Empowerment', 7, 'J'),
              t('مدير عمليات — القطاع غير الربحي والتمكين المنظومي', 'Operations Manager — Nonprofit Sector & Ecosystem Empowerment', 7, 'M'),
              t('أخصائي تشغيل — القطاع غير الربحي والتمكين المنظومي', 'Operations Specialist — Nonprofit Sector & Ecosystem Empowerment', 7, 'P'),
              t('مساعد مدير مشروع — القطاع غير الربحي والتمكين المنظومي', 'Assistant Project Manager — Nonprofit Sector & Ecosystem Empowerment', 8, 'S'),
              t('منسق مشروع — القطاع غير الربحي والتمكين المنظومي', 'Project Coordinator — Nonprofit Sector & Ecosystem Empowerment', 9, 'J'),
              t('منسق تشغيل — القطاع غير الربحي والتمكين المنظومي', 'Operations Coordinator — Nonprofit Sector & Ecosystem Empowerment', 9, 'P'),
            ]),
          ]),
          section('قسم تمكين المشاريع', 'Project Enablement Section', [
            t('رئيس قسم تمكين المشاريع', 'Project Enablement Section Head', 4, 'M'),
          ], [
            unit('وحدة دعم المشاريع', 'Project Support Unit', [
              t('رئيس وحدة دعم المشاريع', 'Project Support Unit Head', 5, 'M'),
              t('قائد فريق دعم المشاريع', 'Project Support Team Lead', 6, 'M'),
              t('أخصائي أول دعم المشاريع', 'Senior Project Support Specialist', 6, 'P'),
              t('أخصائي دعم المشاريع', 'Project Support Specialist', 7, 'P'),
              t('منسق دعم المشاريع', 'Project Support Coordinator', 9, 'P'),
            ]),
            unit('وحدة ضبط المشاريع', 'Project Controls Unit', [
              t('رئيس وحدة ضبط المشاريع', 'Project Controls Unit Head', 5, 'M'),
              t('قائد فريق ضبط المشاريع', 'Project Controls Team Lead', 6, 'M'),
              t('أخصائي أول ضبط المشاريع', 'Senior Project Controls Specialist', 6, 'P'),
              t('أخصائي ضبط المشاريع', 'Project Controls Specialist', 7, 'P'),
              t('منسق ضبط المشاريع', 'Project Controls Coordinator', 9, 'P'),
            ]),
          ]),
        ]),
        department('إدارة الخدمات المشتركة', 'Shared Services Department', [
          t('مدير إدارة الخدمات المشتركة', 'Shared Services Department Manager', 3, 'M'),
        ], [
          section('قسم المالية', 'Finance Section', [
            t('رئيس قسم المالية', 'Finance Section Head', 4, 'M'),
          ], [
            unit('وحدة المحاسبة والتقارير المالية', 'Accounting & Financial Reporting Unit', [
              t('رئيس وحدة المحاسبة والتقارير المالية', 'Accounting & Financial Reporting Unit Head', 5, 'M'),
              t('قائد فريق المحاسبة والتقارير المالية', 'Accounting & Financial Reporting Team Lead', 6, 'M'),
              t('أخصائي أول المحاسبة والتقارير المالية', 'Senior Accounting & Financial Reporting Specialist', 6, 'P'),
              t('أخصائي المحاسبة والتقارير المالية', 'Accounting & Financial Reporting Specialist', 7, 'P'),
              t('منسق المحاسبة والتقارير المالية', 'Accounting & Financial Reporting Coordinator', 9, 'P'),
            ]),
            unit('وحدة الخزينة', 'Treasury Unit', [
              t('رئيس وحدة الخزينة', 'Treasury Unit Head', 5, 'M'),
              t('قائد فريق الخزينة', 'Treasury Team Lead', 6, 'M'),
              t('أخصائي أول الخزينة', 'Senior Treasury Specialist', 6, 'P'),
              t('أخصائي الخزينة', 'Treasury Specialist', 7, 'P'),
              t('منسق الخزينة', 'Treasury Coordinator', 9, 'P'),
            ]),
            unit('وحدة التخطيط والتحليل المالي', 'Financial Planning & Analysis Unit', [
              t('رئيس وحدة التخطيط والتحليل المالي', 'Financial Planning & Analysis Unit Head', 5, 'M'),
              t('قائد فريق التخطيط والتحليل المالي', 'Financial Planning & Analysis Team Lead', 6, 'M'),
              t('أخصائي أول التخطيط والتحليل المالي', 'Senior Financial Planning & Analysis Specialist', 6, 'P'),
              t('أخصائي التخطيط والتحليل المالي', 'Financial Planning & Analysis Specialist', 7, 'P'),
              t('منسق التخطيط والتحليل المالي', 'Financial Planning & Analysis Coordinator', 9, 'P'),
            ]),
          ]),
          section('قسم الموارد البشرية والخدمات الإدارية', 'HR & Administrative Services Section', [
            t('رئيس قسم الموارد البشرية والخدمات الإدارية', 'HR & Administrative Services Section Head', 4, 'M'),
          ], [
            unit('وحدة الاستقطاب وإدارة المواهب', 'Talent Acquisition & Management Unit', [
              t('رئيس وحدة الاستقطاب وإدارة المواهب', 'Talent Acquisition & Management Unit Head', 5, 'M'),
              t('قائد فريق الاستقطاب وإدارة المواهب', 'Talent Acquisition & Management Team Lead', 6, 'M'),
              t('أخصائي أول الاستقطاب وإدارة المواهب', 'Senior Talent Acquisition & Management Specialist', 6, 'P'),
              t('أخصائي الاستقطاب وإدارة المواهب', 'Talent Acquisition & Management Specialist', 7, 'P'),
              t('منسق الاستقطاب وإدارة المواهب', 'Talent Acquisition & Management Coordinator', 9, 'P'),
            ]),
            unit('وحدة التطوير التنظيمي', 'Organizational Development Unit', [
              t('رئيس وحدة التطوير التنظيمي', 'Organizational Development Unit Head', 5, 'M'),
              t('قائد فريق التطوير التنظيمي', 'Organizational Development Team Lead', 6, 'M'),
              t('أخصائي أول تطوير تنظيمي', 'Senior Organizational Development Specialist', 6, 'P'),
              t('أخصائي تطوير تنظيمي', 'Organizational Development Specialist', 7, 'P'),
              t('منسق تطوير تنظيمي', 'Organizational Development Coordinator', 9, 'P'),
            ]),
            unit('وحدة العمليات والشؤون الحكومية', 'HR Operations & Government Relations Unit', [
              t('رئيس وحدة العمليات والشؤون الحكومية', 'HR Operations & Government Relations Unit Head', 5, 'M'),
              t('قائد فريق العمليات والشؤون الحكومية', 'HR Operations & Government Relations Team Lead', 6, 'M'),
              t('أخصائي أول العمليات والشؤون الحكومية', 'Senior HR Operations & Government Relations Specialist', 6, 'P'),
              t('أخصائي العمليات والشؤون الحكومية', 'HR Operations & Government Relations Specialist', 7, 'P'),
              t('منسق العمليات والشؤون الحكومية', 'HR Operations & Government Relations Coordinator', 9, 'P'),
            ]),
            unit('وحدة إدارة المرافق', 'Facilities Management Unit', [
              t('رئيس وحدة إدارة المرافق', 'Facilities Management Unit Head', 5, 'M'),
              t('قائد فريق إدارة المرافق', 'Facilities Management Team Lead', 6, 'M'),
              t('أخصائي أول إدارة المرافق', 'Senior Facilities Management Specialist', 6, 'P'),
              t('أخصائي إدارة المرافق', 'Facilities Management Specialist', 7, 'P'),
              t('منسق إدارة المرافق', 'Facilities Management Coordinator', 9, 'P'),
            ]),
          ]),
          section('قسم التقنية', 'Technology Section', [
            t('رئيس قسم التقنية', 'Technology Section Head', 4, 'M'),
          ], [
            unit('وحدة المنتجات والحلول التقنية', 'Technology Products & Solutions Unit', [
              t('رئيس وحدة المنتجات والحلول التقنية', 'Technology Products & Solutions Unit Head', 5, 'M'),
              t('مدير أول منتجات ومشاريع تقنية', 'Senior Technology Product & Project Manager', 6, 'J'),
              t('قائد فريق تحليل الأعمال', 'Business Analysis Team Lead', 6, 'M'),
              t('قائد فريق المنتجات والمشاريع التقنية', 'Technology Product & Project Team Lead', 6, 'M'),
              t('محلل أعمال أول', 'Senior Business Analyst', 6, 'P'),
              t('مدير منتجات ومشاريع تقنية', 'Technology Product & Project Manager', 7, 'J'),
              t('محلل أعمال', 'Business Analyst', 7, 'P'),
              t('محلل أعمال مبتدئ', 'Junior Business Analyst', 8, 'P'),
              t('منسق مشاريع تقنية', 'Technology Project Coordinator', 9, 'J'),
            ]),
            unit('وحدة التحول والحلول الرقمية', 'Digital Transformation & Solutions Unit', [
              t('رئيس وحدة التحول والحلول الرقمية', 'Digital Transformation & Solutions Unit Head', 5, 'M'),
              t('قائد فريق التحول والحلول الرقمية', 'Digital Transformation & Solutions Team Lead', 6, 'M'),
              t('قائد فريق حلول الذكاء الاصطناعي', 'AI Solutions Team Lead', 6, 'M'),
              t('قائد فريق تطوير برمجيات', 'Software Development Team Lead', 6, 'M'),
              t('قائد فريق الحلول الرقمية', 'Digital Solutions Team Lead', 6, 'M'),
              t('أخصائي أول تحول رقمي', 'Senior Digital Transformation Specialist', 6, 'P'),
              t('مهندس أول لحلول الذكاء الاصطناعي', 'Senior AI Solutions Engineer', 6, 'P'),
              t('مطور برمجيات أول', 'Senior Software Developer', 6, 'P'),
              t('أخصائي أول حلول رقمية', 'Senior Digital Solutions Specialist', 6, 'P'),
              t('أخصائي تحول رقمي', 'Digital Transformation Specialist', 7, 'P'),
              t('مهندس حلول ذكاء اصطناعي', 'AI Solutions Engineer', 7, 'P'),
              t('مطور برمجيات', 'Software Developer', 7, 'P'),
              t('أخصائي حلول رقمية', 'Digital Solutions Specialist', 7, 'P'),
              t('مهندس حلول ذكاء اصطناعي مبتدئ', 'Junior AI Solutions Engineer', 8, 'P'),
              t('مطور برمجيات مبتدئ', 'Junior Software Developer', 8, 'P'),
              t('منسق تحول رقمي', 'Digital Transformation Coordinator', 9, 'P'),
              t('منسق حلول رقمية', 'Digital Solutions Coordinator', 9, 'P'),
            ]),
            unit('وحدة البنية التحتية والدعم التقني', 'IT Infrastructure & Technical Support Unit', [
              t('رئيس وحدة البنية التحتية والدعم التقني', 'IT Infrastructure & Technical Support Unit Head', 5, 'M'),
              t('قائد فريق البنية التحتية والدعم التقني', 'IT Infrastructure & Support Team Lead', 6, 'M'),
              t('أخصائي أول البنية التحتية والدعم التقني', 'Senior IT Infrastructure & Support Specialist', 6, 'P'),
              t('فني البنية التحتية والدعم التقني', 'IT Infrastructure & Support Technician', 7, 'P'),
              t('أخصائي البنية التحتية والدعم التقني', 'IT Infrastructure & Support Specialist', 7, 'P'),
            ]),
            unit('وحدة التصاميم', 'Design Unit', [
              t('رئيس وحدة التصاميم', 'Design Unit Head', 5, 'M'),
              t('قائد فريق التصاميم', 'Design Team Lead', 6, 'M'),
              t('مصمم أول', 'Senior Designer', 6, 'P'),
              t('مشرف التصاميم', 'Design Supervisor', 6, 'P'),
              t('مصمم', 'Designer', 7, 'P'),
            ]),
          ]),
        ]),
        office('مكتب قطاع التشغيل وتقديم الخدمات', 'Operations & Service Delivery Sector Office', [
          t('مدير قطاع التشغيل وتقديم الخدمات', 'Operations & Service Delivery Sector Director', 2, 'M'),
          t('مساعد تنفيذي — إدارة قطاع التشغيل وتقديم الخدمات', 'Executive Assistant — Operations & Service Delivery Sector', 8, 'S'),
        ], [
          section('قسم الأداء والتميز التشغيلي', 'Performance & Operational Excellence Section', [
            t('رئيس قسم الأداء والتميز التشغيلي', 'Performance & Operational Excellence Section Head', 4, 'M'),
            t('أخصائي أول الأداء والتميز التشغيلي', 'Senior Performance & Operational Excellence Specialist', 6, 'P'),
            t('أخصائي الأداء والتميز التشغيلي', 'Performance & Operational Excellence Specialist', 7, 'P'),
            t('منسق الأداء والتميز التشغيلي', 'Performance & Operational Excellence Coordinator', 9, 'P'),
          ]),
        ]),
      ])),
  top('BUS',
      sector('قطاع الأعمال والاستشارات', 'Business & Consulting Sector', [], [
        department('إدارة الاستشارات', 'Consulting Department', [
          t('مدير إدارة الاستشارات (مستشار أول)', 'Consulting Department Manager (Senior Consultant)', 3, 'C'),
          t('مستشار — الاستشارات', 'Consultant — Consulting', 5, 'C'),
          t('مستشار مساعد — الاستشارات', 'Associate Consultant — Consulting', 7, 'C'),
          t('محلل استشاري — الاستشارات', 'Consulting Analyst — Consulting', 8, 'C'),
        ]),
        department('إدارة التدريب وبناء القدرات', 'Training & Capacity Building Department', [
          t('مدير إدارة التدريب وبناء القدرات (مستشار أول)', 'Training & Capacity Building Department Manager (Senior Consultant)', 3, 'C'),
          t('مستشار — التدريب وبناء القدرات', 'Training & Capacity Building Consultant', 5, 'C'),
          t('مستشار مساعد — التدريب وبناء القدرات', 'Training & Capacity Building Associate Consultant', 7, 'C'),
          t('محلل استشاري — التدريب وبناء القدرات', 'Training & Capacity Building Analyst', 8, 'C'),
        ]),
        department('إدارة المعرفة والدراسات', 'Knowledge & Studies Department', [
          t('مدير إدارة المعرفة والدراسات (مستشار أول)', 'Knowledge & Studies Department Manager (Senior Consultant)', 3, 'C'),
          t('مستشار — المعرفة والدراسات', 'Knowledge & Studies Consultant', 5, 'C'),
          t('مستشار مساعد — المعرفة والدراسات', 'Knowledge & Studies Associate Consultant', 7, 'C'),
          t('محلل استشاري — المعرفة والدراسات', 'Knowledge & Studies Analyst', 8, 'C'),
        ]),
        department('إدارة المنهجيات والجودة الفنية', 'Methodologies & Technical Quality Department', [
          t('مدير إدارة المنهجيات والجودة الفنية (مستشار أول)', 'Methodologies & Technical Quality Department Manager (Senior Consultant)', 3, 'C'),
          t('مستشار — المنهجيات والجودة الفنية', 'Methodologies & Technical Quality Consultant', 5, 'C'),
          t('مستشار مساعد — المنهجيات والجودة الفنية', 'Methodologies & Technical Quality Associate Consultant', 7, 'C'),
          t('محلل استشاري — المنهجيات والجودة الفنية', 'Methodologies & Technical Quality Analyst', 8, 'C'),
        ]),
        department('إدارة تقييم الأسواق والمبادرات', 'Market & Initiative Assessment Department', [
          t('مدير إدارة تقييم الأسواق والمبادرات (مستشار أول)', 'Market & Initiative Assessment Department Manager (Senior Consultant)', 3, 'C'),
          t('مستشار — تقييم الأسواق والمبادرات', 'Market & Initiative Assessment Consultant', 5, 'C'),
          t('مستشار مساعد — تقييم الأسواق والمبادرات', 'Market & Initiative Assessment Associate Consultant', 7, 'C'),
          t('محلل استشاري — تقييم الأسواق والمبادرات', 'Market & Initiative Assessment Analyst', 8, 'C'),
        ]),
        office('مكتب قطاع الأعمال والاستشارات', 'Business & Consulting Sector Office', [
          t('مدير قطاع الأعمال والاستشارات', 'Business & Consulting Sector Director', 2, 'M'),
        ]),
      ])),
  top('COM',
      department('إدارة التواصل المؤسسي', 'Corporate Communications Department', [
        t('مدير إدارة التواصل المؤسسي', 'Corporate Communications Department Manager', 3, 'M'),
        t('أخصائي أول تواصل مؤسسي', 'Senior Corporate Communications Specialist', 6, 'P'),
        t('أخصائي تواصل مؤسسي', 'Corporate Communications Specialist', 7, 'P'),
        t('مساعد إداري لمدير إدارة التواصل المؤسسي', 'Administrative Assistant to the Corporate Communications Department Manager', 8, 'S'),
      ], [
        section('قسم التسويق والعلاقات العامة', 'Marketing & Public Relations Section', [
          t('رئيس قسم التسويق والعلاقات العامة', 'Marketing & Public Relations Section Head', 4, 'M'),
        ], [
          unit('وحدة التسويق', 'Marketing Unit', [
            t('رئيس وحدة التسويق', 'Marketing Unit Head', 5, 'M'),
            t('قائد فريق التسويق', 'Marketing Team Lead', 6, 'M'),
            t('أخصائي أول تسويق استراتيجي', 'Senior Strategic Marketing Specialist', 6, 'P'),
            t('أخصائي حملات', 'Marketing Campaigns Specialist', 7, 'P'),
            t('أخصائي تسويق رقمي', 'Digital Marketing Specialist', 7, 'P'),
            t('مساعد تسويق', 'Marketing Assistant', 8, 'S'),
          ]),
          unit('وحدة العلاقات العامة', 'Public Relations Unit', [
            t('رئيس وحدة العلاقات العامة', 'Public Relations Unit Head', 5, 'M'),
            t('قائد فريق العلاقات العامة', 'Public Relations Team Lead', 6, 'M'),
            t('أخصائي أول العلاقات العامة', 'Senior Public Relations Specialist', 6, 'P'),
            t('أخصائي علاقات عامة', 'Public Relations Specialist', 7, 'P'),
            t('منسق التمثيل الخارجي والفعاليات', 'External Representation & Events Coordinator', 9, 'P'),
          ]),
          unit('وحدة المحتوى والإنتاج الإبداعي', 'Content & Creative Production Unit', [
            t('رئيس وحدة المحتوى والإنتاج الإبداعي', 'Content & Creative Production Unit Head', 5, 'M'),
            t('قائد فريق المحتوى والإنتاج الإبداعي', 'Content & Creative Production Team Lead', 6, 'M'),
            t('كاتب محتوى أول', 'Senior Content Writer', 6, 'P'),
            t('مصور - منتج محتوى بصري', 'Photographer – Visual Content Producer', 7, 'P'),
            t('مصمم جرافيك', 'Graphic Designer', 7, 'P'),
            t('كاتب محتوى', 'Content Writer', 7, 'P'),
          ]),
          unit('وحدة علاقات العملاء وأصحاب المصلحة', 'Client & Stakeholder Relations Unit', [
            t('رئيس وحدة علاقات العملاء وأصحاب المصلحة', 'Client & Stakeholder Relations Unit Head', 5, 'M'),
            t('قائد فريق علاقات العملاء وأصحاب المصلحة', 'Client & Stakeholder Relations Team Lead', 6, 'M'),
            t('أخصائي أول علاقات العملاء', 'Senior Client Relations Specialist', 6, 'P'),
            t('أخصائي إدارة حسابات', 'Account Management Specialist', 7, 'P'),
            t('أخصائي تجربة عملاء', 'Client Experience Specialist', 7, 'P'),
            t('منسق علاقات العملاء', 'Client Relations Coordinator', 9, 'P'),
          ]),
        ]),
        section('قسم الاتصال الداخلي والثقافة', 'Internal Communications & Culture Section', [
          t('رئيس قسم الاتصال الداخلي والثقافة', 'Internal Communications & Culture Section Head', 4, 'M'),
          t('أخصائي أول التواصل الداخلي', 'Senior Internal Communications Specialist', 6, 'P'),
          t('أخصائي التواصل الداخلي', 'Internal Communications Specialist', 7, 'P'),
          t('منسق فعاليات داخلية', 'Internal Events Coordinator', 9, 'P'),
        ]),
      ])),
  top('STR',
      department('إدارة الاستراتيجية والحوكمة', 'Strategy & Governance Department', [
        t('مدير إدارة الاستراتيجية والحوكمة', 'Strategy & Governance Department Manager', 3, 'M'),
        t('أخصائي أول التخطيط ومراقبة الأداء', 'Senior Planning & Performance Monitoring Specialist', 6, 'P'),
        t('أخصائي التخطيط ومراقبة الأداء', 'Planning & Performance Monitoring Specialist', 7, 'P'),
        t('منسق التخطيط ومراقبة الأداء', 'Planning & Performance Monitoring Coordinator', 9, 'P'),
      ])),
  top('EXE',
      office('مكتب الرئيس التنفيذي', 'Office of the CEO', [
        t('الرئيس التنفيذي', 'Chief Executive Officer', 1, 'M'),
      ])),
];
