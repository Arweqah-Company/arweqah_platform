/**
 * Arweqah Alreyadah's organization structure with every job title, from the owner's official file `docs/organizational_structure.md`
 * (sector → department → section → unit; a sector or department office sits beside its departments; communication, strategy and the CEO
 * office sit directly under the group). Titles carry the grade and track of the file's code (`L7P` = grade 7, track P), so the platform builds
 * `<unit code>-L7P-01` itself; the three-letter prefix of a top unit is the file's (GRW, OPS, CON, COM, STG, EXE).
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
      office('مكتب قطاع النمو وتطوير الأعمال', 'Growth & Business Development Sector Office', [
        t('مدير قطاع النمو وتطوير الأعمال', 'Growth & Business Development Sector Director', 2, 'M'),
        t('مساعد إداري - قطاع النمو', 'Administrative Assistant — Growth Sector', 8, 'S'),
        t('أخصائي شؤون إدارية - قطاع النمو', 'Administrative Affairs Specialist — Growth Sector', 8, 'S'),
      ]),
      department('إدارة تطوير الأعمال', 'Business Development Department', [
        t('أخصائي تطوير أعمال', 'Business Development Specialist', 7, 'P'),
        t('أخصائي أول تطوير أعمال', 'Senior Business Development Specialist', 6, 'P'),
        t('مدير إدارة تطوير الأعمال', 'Business Development Department Manager', 3, 'M'),
        t('محلل أعمال', 'Business Analyst', 7, 'P'),
      ]),
      department('إدارة المنتجات والخدمات', 'Products & Services Department', [
        t('منسق المنتجات والخدمات', 'Products & Services Coordinator', 9, 'P'),
        t('أخصائي منتجات وخدمات', 'Products & Services Specialist', 7, 'P'),
        t('أخصائي أول المنتجات والخدمات', 'Senior Products & Services Specialist', 6, 'P'),
        t('مدير إدارة المنتجات والخدمات', 'Products & Services Department Manager', 3, 'M'),
      ]),
      department('إدارة الشراكات وعلاقات العملاء', 'Partnerships & Client Relations Department', [
        t('منسق الشراكات وعلاقات العملاء', 'Partnerships & Client Relations Coordinator', 9, 'P'),
        t('أخصائي شراكات وعلاقات العملاء', 'Partnerships & Client Relations Specialist', 7, 'P'),
        t('أخصائي أول الشراكات وعلاقات العملاء', 'Senior Partnerships & Client Relations Specialist', 6, 'P'),
        t('مدير إدارة الشراكات وعلاقات العملاء', 'Partnerships & Client Relations Department Manager', 3, 'M'),
      ]),
    ])),
  top('OPS',
      sector('قطاع التشغيل وتقديم الخدمات', 'Operations & Service Delivery Sector', [], [
      office('مكتب قطاع التشغيل وتقديم الخدمات', 'Operations & Service Delivery Sector Office', [
        t('مدير قطاع العمليات وتقديم الخدمات', 'Operations & Service Delivery Sector Director', 2, 'M'),
        t('مساعد إداري - قطاع العمليات', 'Administrative Assistant — Operations Sector', 8, 'S'),
      ], [
        section('قسم التميز التشغيلي والأداء', 'Performance & Operational Excellence Section', [
          t('أخصائي تميز تشغيلي وأداء', 'Performance & Operational Excellence Specialist', 7, 'P'),
          t('أخصائي أول تميز تشغيلي وأداء', 'Senior Performance & Operational Excellence Specialist', 6, 'P'),
          t('رئيس قسم التميز التشغيلي والأداء', 'Performance & Operational Excellence Section Head', 4, 'M'),
          t('مدير إدارة التميز التشغيلي والأداء', 'Performance & Operational Excellence Department Manager', 3, 'M'),
        ]),
      ]),
      department('إدارة المشاريع', 'Project Management Department', [
        t('مدير إدارة المشاريع', 'Project Management Department Manager', 3, 'M'),
      ], [
        section('قسم تنفيذ المشاريع', 'Project Delivery Section', [], [
          unit('محفظة الريادة والابتكار', 'Entrepreneurship & Innovation Portfolio', [
            t('مدير محفظة - ريادة الأعمال والابتكار', 'Portfolio Manager — Entrepreneurship & Innovation', 4, 'M'),
            t('مدير عمليات المحفظة - ريادة الأعمال والابتكار', 'Portfolio Operations Manager — Entrepreneurship & Innovation', 6, 'M'),
            t('مدير عمليات - ريادة الأعمال والابتكار', 'Operations Manager — Entrepreneurship & Innovation', 7, 'M'),
            t('مدير برنامج - ريادة الأعمال والابتكار', 'Program Manager — Entrepreneurship & Innovation', 5, 'J'),
            t('مدير مشاريع أول - ريادة الأعمال والابتكار', 'Senior Project Manager — Entrepreneurship & Innovation', 6, 'J'),
            t('مدير مشاريع - ريادة الأعمال والابتكار', 'Project Manager — Entrepreneurship & Innovation', 7, 'J'),
            t('مساعد مدير مشاريع - ريادة الأعمال والابتكار', 'Assistant Project Manager — Entrepreneurship & Innovation', 8, 'S'),
            t('منسق مشاريع - ريادة الأعمال والابتكار', 'Project Coordinator — Entrepreneurship & Innovation', 9, 'J'),
            t('قائد مشروع - ريادة الأعمال والابتكار', 'Project Lead — Entrepreneurship & Innovation', 6, 'S'),
            t('أخصائي عمليات - ريادة الأعمال والابتكار', 'Operations Specialist — Entrepreneurship & Innovation', 7, 'P'),
            t('مشرف عمليات - ريادة الأعمال والابتكار', 'Operations Supervisor — Entrepreneurship & Innovation', 6, 'P'),
            t('منسق عمليات - ريادة الأعمال والابتكار', 'Operations Coordinator — Entrepreneurship & Innovation', 9, 'P'),
            t('مدير مشاريع رئيسي - ريادة الأعمال والابتكار', 'Principal Project Manager — Entrepreneurship & Innovation', 5, 'J'),
            t('أخصائي أول عمليات - ريادة الأعمال والابتكار', 'Senior Operations Specialist — Entrepreneurship & Innovation', 6, 'P'),
          ]),
          unit('محفظة التمكين والتنمية', 'Empowerment & Development Portfolio', [
            t('مدير محفظة - التمكين والتنمية', 'Portfolio Manager — Empowerment & Development', 4, 'M'),
            t('مدير عمليات المحفظة - التمكين والتنمية', 'Portfolio Operations Manager — Empowerment & Development', 6, 'M'),
            t('مدير عمليات - التمكين والتنمية', 'Operations Manager — Empowerment & Development', 7, 'M'),
            t('مدير برنامج - التمكين والتنمية', 'Program Manager — Empowerment & Development', 5, 'J'),
            t('مدير مشاريع أول - التمكين والتنمية', 'Senior Project Manager — Empowerment & Development', 6, 'J'),
            t('مدير مشاريع - التمكين والتنمية', 'Project Manager — Empowerment & Development', 7, 'J'),
            t('مساعد مدير مشاريع - التمكين والتنمية', 'Assistant Project Manager — Empowerment & Development', 8, 'S'),
            t('منسق مشاريع - التمكين والتنمية', 'Project Coordinator — Empowerment & Development', 9, 'J'),
            t('أخصائي أول عمليات - التمكين والتنمية', 'Senior Operations Specialist — Empowerment & Development', 6, 'P'),
            t('أخصائي عمليات - التمكين والتنمية', 'Operations Specialist — Empowerment & Development', 7, 'P'),
            t('منسق عمليات - التمكين والتنمية', 'Operations Coordinator — Empowerment & Development', 9, 'P'),
            t('مدير مشاريع رئيسي - التمكين والتنمية', 'Principal Project Manager — Empowerment & Development', 5, 'J'),
            t('مشرف عمليات - التمكين والتنمية', 'Operations Supervisor — Empowerment & Development', 6, 'P'),
          ]),
          unit('محفظة القطاع غير الربحي والتمكين المنظومي', 'Nonprofit Sector & Ecosystem Empowerment Portfolio', [
            t('مدير محفظة - القطاع غير الربحي', 'Portfolio Manager — Nonprofit Sector & Ecosystem Empowerment', 4, 'M'),
            t('مدير عمليات المحفظة - القطاع غير الربحي', 'Portfolio Operations Manager — Nonprofit Sector & Ecosystem Empowerment', 6, 'M'),
            t('مدير عمليات - القطاع غير الربحي', 'Operations Manager — Nonprofit Sector & Ecosystem Empowerment', 7, 'M'),
            t('مدير برنامج - القطاع غير الربحي', 'Program Manager — Nonprofit Sector & Ecosystem Empowerment', 5, 'J'),
            t('مدير مشاريع أول - القطاع غير الربحي', 'Senior Project Manager — Nonprofit Sector & Ecosystem Empowerment', 6, 'J'),
            t('مدير مشاريع - القطاع غير الربحي', 'Project Manager — Nonprofit Sector & Ecosystem Empowerment', 7, 'J'),
            t('مساعد مدير مشاريع - القطاع غير الربحي', 'Assistant Project Manager — Nonprofit Sector & Ecosystem Empowerment', 8, 'S'),
            t('منسق مشاريع - القطاع غير الربحي', 'Project Coordinator — Nonprofit Sector & Ecosystem Empowerment', 9, 'J'),
            t('مشرف عمليات - القطاع غير الربحي', 'Operations Supervisor — Nonprofit Sector & Ecosystem Empowerment', 6, 'P'),
            t('أخصائي عمليات - القطاع غير الربحي', 'Operations Specialist — Nonprofit Sector & Ecosystem Empowerment', 7, 'P'),
            t('منسق عمليات - القطاع غير الربحي', 'Operations Coordinator — Nonprofit Sector & Ecosystem Empowerment', 9, 'P'),
            t('مدير مشاريع رئيسي - القطاع غير الربحي', 'Principal Project Manager — Nonprofit Sector & Ecosystem Empowerment', 5, 'J'),
            t('أخصائي أول عمليات - القطاع غير الربحي', 'Senior Operations Specialist — Nonprofit Sector & Ecosystem Empowerment', 6, 'P'),
          ]),
        ]),
        section('قسم تمكين المشاريع', 'Project Enablement Section', [
          t('رئيس قسم تمكين المشاريع', 'Project Enablement Section Head', 4, 'M'),
        ], [
          unit('وحدة مراقبة المشاريع', 'Project Controls Unit', [
            t('رئيس وحدة مراقبة المشاريع', 'Project Controls Unit Head', 5, 'M'),
            t('أخصائي أول مراقبة مشاريع', 'Senior Project Controls Specialist', 6, 'P'),
            t('أخصائي مراقبة مشاريع', 'Project Controls Specialist', 7, 'P'),
            t('مشرف مراقبة مشاريع', 'Project Controls Supervisor', 6, 'S'),
            t('قائد مراقبة مشاريع', 'Project Controls Lead', 6, 'S'),
          ]),
          unit('وحدة دعم المشاريع', 'Project Support Unit', [
            t('رئيس وحدة دعم المشاريع', 'Project Support Unit Head', 5, 'M'),
            t('أخصائي أول دعم مشاريع', 'Senior Project Support Specialist', 6, 'P'),
            t('أخصائي دعم مشاريع', 'Project Support Specialist', 7, 'P'),
            t('مشرف دعم مشاريع', 'Project Support Supervisor', 6, 'S'),
            t('قائد دعم مشاريع', 'Project Support Lead', 6, 'S'),
          ]),
        ]),
      ]),
      department('إدارة العمليات', 'Operations Department', [
        t('مدير إدارة العمليات', 'Operations Department Manager', 3, 'M'),
      ], [
        section('قسم رحلة المستفيد', 'Beneficiary Journey Section', [
          t('رئيس قسم رحلة المستفيد', 'Beneficiary Journey Section Head', 4, 'M'),
        ], [
          unit('وحدة التوعية والتواصل مع المستفيدين', 'Beneficiary Outreach Unit', [
            t('رئيس وحدة التوعية والتواصل', 'Beneficiary Outreach Unit Head', 5, 'M'),
            t('أخصائي أول توعية وتواصل', 'Senior Beneficiary Outreach Specialist', 6, 'P'),
            t('أخصائي توعية وتواصل', 'Beneficiary Outreach Specialist', 7, 'P'),
            t('مشرف توعية وتواصل', 'Beneficiary Outreach Supervisor', 6, 'S'),
            t('قائد توعية وتواصل', 'Beneficiary Outreach Lead', 6, 'S'),
          ]),
          unit('وحدة إدارة المستفيدين', 'Beneficiary Management Unit', [
            t('رئيس وحدة إدارة المستفيدين', 'Beneficiary Management Unit Head', 5, 'M'),
            t('أخصائي أول إدارة مستفيدين', 'Senior Beneficiary Management Specialist', 6, 'P'),
            t('أخصائي إدارة مستفيدين', 'Beneficiary Management Specialist', 7, 'P'),
            t('مشرف إدارة مستفيدين', 'Beneficiary Management Supervisor', 6, 'S'),
            t('قائد إدارة مستفيدين', 'Beneficiary Management Lead', 6, 'S'),
          ]),
        ]),
        section('قسم التوريدات الاستراتيجية', 'Strategic Sourcing Section', [
          t('رئيس قسم التوريدات الاستراتيجية', 'Strategic Sourcing Section Head', 4, 'M'),
        ], [
          unit('وحدة المشتريات', 'Procurement Unit', [
            t('رئيس وحدة المشتريات', 'Procurement Unit Head', 5, 'M'),
            t('أخصائي أول مشتريات', 'Senior Procurement Specialist', 6, 'P'),
            t('أخصائي مشتريات', 'Procurement Specialist', 7, 'P'),
            t('مشرف مشتريات', 'Procurement Supervisor', 6, 'S'),
            t('قائد مشتريات', 'Procurement Lead', 6, 'S'),
          ]),
          unit('وحدة الشراكات', 'Partnerships Unit', [
            t('رئيس وحدة الشراكات', 'Partnerships Unit Head', 5, 'M'),
            t('أخصائي أول شراكات', 'Senior Partnerships Specialist', 6, 'P'),
            t('أخصائي شراكات', 'Partnerships Specialist', 7, 'P'),
            t('مشرف شراكات', 'Partnerships Supervisor', 6, 'S'),
            t('قائد شراكات', 'Partnerships Lead', 6, 'S'),
          ]),
          unit('وحدة الرعاية والتمويل', 'Sponsorship Unit', [
            t('رئيس وحدة الرعاية والتمويل', 'Sponsorship Unit Head', 5, 'M'),
            t('أخصائي أول رعاية وتمويل', 'Senior Sponsorship Specialist', 6, 'P'),
            t('أخصائي رعاية وتمويل', 'Sponsorship Specialist', 7, 'P'),
            t('مشرف رعاية وتمويل', 'Sponsorship Supervisor', 6, 'S'),
            t('قائد رعاية وتمويل', 'Sponsorship Lead', 6, 'S'),
          ]),
        ]),
        section('قسم تطوير أعمال المستفيدين', 'Beneficiary Business Development Section', [
          t('رئيس قسم تطوير أعمال المستفيدين', 'Beneficiary Business Development Section Head', 4, 'M'),
        ], [
          unit('وحدة التدريب وبناء القدرات', 'Training & Capacity Building Unit', [
            t('رئيس وحدة التدريب وبناء القدرات', 'Training & Capacity Building Unit Head', 5, 'M'),
            t('أخصائي أول تدريب وبناء قدرات', 'Senior Training & Capacity Building Specialist', 6, 'P'),
            t('أخصائي تدريب وبناء قدرات', 'Training & Capacity Building Specialist', 7, 'P'),
            t('مشرف تدريب وبناء قدرات', 'Training & Capacity Building Supervisor', 6, 'S'),
            t('قائد تدريب وبناء قدرات', 'Training & Capacity Building Lead', 6, 'S'),
          ]),
          unit('وحدة الإرشاد والتوجيه', 'Mentoring & Guidance Unit', [
            t('رئيس وحدة الإرشاد والتوجيه', 'Mentoring & Guidance Unit Head', 5, 'M'),
            t('أخصائي أول إرشاد وتوجيه', 'Senior Mentoring & Guidance Specialist', 6, 'P'),
            t('أخصائي إرشاد وتوجيه', 'Mentoring & Guidance Specialist', 7, 'P'),
            t('مشرف إرشاد وتوجيه', 'Mentoring & Guidance Supervisor', 6, 'S'),
            t('قائد إرشاد وتوجيه', 'Mentoring & Guidance Lead', 6, 'S'),
          ]),
          unit('وحدة الوصول إلى الأسواق والروابط', 'Market Access & Linkages Unit', [
            t('رئيس وحدة الوصول إلى الأسواق والروابط', 'Market Access & Linkages Unit Head', 5, 'M'),
            t('أخصائي أول وصول للأسواق وروابط', 'Senior Market Access & Linkages Specialist', 6, 'P'),
            t('أخصائي وصول للأسواق وروابط', 'Market Access & Linkages Specialist', 7, 'P'),
            t('مشرف وصول للأسواق وروابط', 'Market Access & Linkages Supervisor', 6, 'S'),
            t('قائد وصول للأسواق وروابط', 'Market Access & Linkages Lead', 6, 'S'),
          ]),
          unit('وحدة حلول وخدمات الأعمال', 'Business Solutions & Services Unit', [
            t('رئيس وحدة حلول وخدمات الأعمال', 'Business Solutions & Services Unit Head', 5, 'M'),
            t('أخصائي أول حلول وخدمات أعمال', 'Senior Business Solutions & Services Specialist', 6, 'P'),
            t('أخصائي حلول وخدمات أعمال', 'Business Solutions & Services Specialist', 7, 'P'),
            t('مشرف حلول وخدمات أعمال', 'Business Solutions & Services Supervisor', 6, 'S'),
            t('قائد حلول وخدمات أعمال', 'Business Solutions & Services Lead', 6, 'S'),
          ]),
        ]),
        section('قسم العمليات الميدانية', 'Field Operations Section', [
          t('رئيس قسم العمليات الميدانية', 'Field Operations Section Head', 4, 'M'),
        ], [
          unit('وحدة الخدمات اللوجستية والتخزين', 'Logistics & Warehousing Unit', [
            t('رئيس وحدة الخدمات اللوجستية والتخزين', 'Logistics & Warehousing Unit Head', 5, 'M'),
            t('أخصائي أول خدمات لوجستية وتخزين', 'Senior Logistics & Warehousing Specialist', 6, 'P'),
            t('أخصائي خدمات لوجستية وتخزين', 'Logistics & Warehousing Specialist', 7, 'P'),
            t('مشرف خدمات لوجستية وتخزين', 'Logistics & Warehousing Supervisor', 6, 'S'),
            t('قائد خدمات لوجستية وتخزين', 'Logistics & Warehousing Lead', 6, 'S'),
          ]),
          unit('وحدة التنفيذ الميداني', 'Field Execution Unit', [
            t('رئيس وحدة التنفيذ الميداني', 'Field Execution Unit Head', 5, 'M'),
            t('أخصائي أول تنفيذ ميداني', 'Senior Field Execution Specialist', 6, 'P'),
            t('أخصائي تنفيذ ميداني', 'Field Execution Specialist', 7, 'P'),
            t('مشرف تنفيذ ميداني', 'Field Execution Supervisor', 6, 'S'),
            t('قائد تنفيذ ميداني', 'Field Execution Lead', 6, 'S'),
          ]),
          unit('وحدة الجودة والامتثال', 'Quality & Compliance Unit', [
            t('رئيس وحدة الجودة والامتثال', 'Quality & Compliance Unit Head', 5, 'M'),
            t('أخصائي أول جودة وامتثال', 'Senior Quality & Compliance Specialist', 6, 'P'),
            t('أخصائي جودة وامتثال', 'Quality & Compliance Specialist', 7, 'P'),
            t('مشرف جودة وامتثال', 'Quality & Compliance Supervisor', 6, 'S'),
            t('قائد جودة وامتثال', 'Quality & Compliance Lead', 6, 'S'),
          ]),
        ]),
      ]),
      department('إدارة الخدمات المشتركة', 'Shared Services Department', [
        t('مدير إدارة الخدمات المشتركة', 'Shared Services Department Manager', 3, 'M'),
      ], [
        section('قسم التكنولوجيا', 'Technology Section', [
          t('رئيس قسم التكنولوجيا', 'Technology Section Head', 4, 'M'),
        ], [
          unit('وحدة التصميم', 'Design Unit', [
            t('رئيس وحدة التصميم', 'Design Unit Head', 5, 'M'),
            t('مصمم أول واجهات وتجربة المستخدم', 'Senior UI/UX Designer', 6, 'P'),
            t('مصمم واجهات وتجربة المستخدم', 'UI/UX Designer', 7, 'P'),
            t('مشرف تصميم', 'Design Supervisor', 6, 'S'),
            t('قائد تصميم', 'Design Lead', 6, 'S'),
          ]),
          unit('وحدة البنية التحتية والدعم الفني', 'IT Infrastructure & Technical Support Unit', [
            t('رئيس وحدة البنية التحتية والدعم الفني', 'IT Infrastructure & Technical Support Unit Head', 5, 'M'),
            t('أخصائي أول بنية تحتية ودعم فني', 'Senior IT Infrastructure & Support Specialist', 6, 'P'),
            t('أخصائي بنية تحتية ودعم فني', 'IT Infrastructure & Support Specialist', 7, 'P'),
            t('مشرف بنية تحتية ودعم فني', 'IT Infrastructure & Support Supervisor', 6, 'S'),
            t('قائد بنية تحتية ودعم فني', 'IT Infrastructure & Support Lead', 6, 'S'),
          ]),
          unit('وحدة التحول الرقمي والحلول', 'Digital Transformation & Solutions Unit', [
            t('رئيس وحدة التحول الرقمي والحلول', 'Digital Transformation & Solutions Unit Head', 5, 'M'),
            t('مدير تحول رقمي', 'Digital Transformation Manager', 4, 'M'),
            t('مهندس معماري حلول', 'Solutions Architect', 5, 'P'),
            t('مهندس برمجيات أول', 'Senior Software Engineer', 6, 'P'),
            t('مهندس برمجيات', 'Software Engineer', 7, 'P'),
            t('مشرف تحول رقمي', 'Digital Transformation Supervisor', 6, 'S'),
            t('مطور أول Full Stack', 'Senior Full Stack Developer', 6, 'P'),
            t('مطور Full Stack', 'Full Stack Developer', 7, 'P'),
            t('قائد تحول رقمي', 'Digital Transformation Lead', 6, 'S'),
            t('مطور أول Backend', 'Senior Backend Developer', 6, 'P'),
            t('مطور Backend', 'Backend Developer', 7, 'P'),
            t('مطور أول Frontend', 'Senior Frontend Developer', 6, 'P'),
            t('مطور Frontend', 'Frontend Developer', 7, 'P'),
            t('مهندس بيانات', 'Data Engineer', 7, 'P'),
            t('مهندس DevOps', 'DevOps Engineer', 7, 'P'),
            t('أخصائي تحول رقمي', 'Digital Transformation Specialist', 7, 'P'),
            t('أخصائي تحول رقمي وحلول', 'Digital Transformation & Solutions Specialist', 7, 'P'),
          ]),
          unit('وحدة منتجات وحلول التكنولوجيا', 'Technology Products & Solutions Unit', [
            t('مدير منتجات أول', 'Senior Product Manager', 4, 'M'),
            t('مدير منتجات', 'Product Manager', 5, 'M'),
            t('أخصائي منتجات تكنولوجية', 'Technology Products Specialist', 7, 'P'),
            t('مشرف منتجات تكنولوجية', 'Technology Products Supervisor', 6, 'S'),
            t('مهندس جودة برمجيات أول', 'Senior QA Engineer', 6, 'P'),
            t('مدير منتجات تقنية', 'Technical Product Manager', 5, 'M'),
            t('قائد منتجات تكنولوجية', 'Technology Products Lead', 6, 'S'),
            t('مهندس جودة برمجيات', 'QA Engineer', 7, 'P'),
            t('رئيس وحدة منتجات التكنولوجيا', 'Technology Products Unit Head', 5, 'M'),
          ]),
        ]),
        section('قسم الموارد البشرية والخدمات الإدارية', 'HR & Administrative Services Section', [
          t('رئيس قسم الموارد البشرية والخدمات الإدارية', 'HR & Administrative Services Section Head', 4, 'M'),
        ], [
          unit('وحدة استقطاب وإدارة المواهب', 'Talent Acquisition & Management Unit', [
            t('رئيس وحدة استقطاب المواهب', 'Talent Acquisition Unit Head', 5, 'M'),
            t('أخصائي أول استقطاب مواهب', 'Senior Talent Acquisition Specialist', 6, 'P'),
            t('أخصائي استقطاب مواهب', 'Talent Acquisition Specialist', 7, 'P'),
            t('مشرف استقطاب مواهب', 'Talent Acquisition Supervisor', 6, 'S'),
            t('قائد استقطاب مواهب', 'Talent Acquisition Lead', 6, 'S'),
          ]),
          unit('وحدة التطوير التنظيمي', 'Organizational Development Unit', [
            t('رئيس وحدة التطوير التنظيمي', 'Organizational Development Unit Head', 5, 'M'),
            t('أخصائي أول تطوير تنظيمي', 'Senior Organizational Development Specialist', 6, 'P'),
            t('أخصائي تطوير تنظيمي', 'Organizational Development Specialist', 7, 'P'),
            t('مشرف تطوير تنظيمي', 'Organizational Development Supervisor', 6, 'S'),
            t('قائد تطوير تنظيمي', 'Organizational Development Lead', 6, 'S'),
          ]),
          unit('وحدة عمليات الموارد البشرية والعلاقات الحكومية', 'HR Operations & Government Relations Unit', [
            t('رئيس وحدة عمليات الموارد البشرية والعلاقات الحكومية', 'HR Operations & Government Relations Unit Head', 5, 'M'),
            t('أخصائي أول عمليات موارد بشرية', 'Senior HR Operations Specialist', 6, 'P'),
            t('أخصائي عمليات موارد بشرية', 'HR Operations Specialist', 7, 'P'),
            t('مشرف عمليات موارد بشرية', 'HR Operations Supervisor', 6, 'S'),
            t('قائد عمليات موارد بشرية', 'HR Operations Lead', 6, 'S'),
          ]),
          unit('وحدة إدارة المرافق', 'Facilities Management Unit', [
            t('رئيس وحدة إدارة المرافق', 'Facilities Management Unit Head', 5, 'M'),
            t('أخصائي أول مرافق', 'Senior Facilities Specialist', 6, 'P'),
            t('أخصائي مرافق', 'Facilities Specialist', 7, 'P'),
            t('مشرف مرافق', 'Facilities Supervisor', 6, 'S'),
            t('قائد مرافق', 'Facilities Lead', 6, 'S'),
          ]),
        ]),
        section('قسم المالية', 'Finance Section', [
          t('رئيس قسم المالية', 'Finance Section Head', 4, 'M'),
        ], [
          unit('وحدة التخطيط والتحليل المالي', 'Financial Planning & Analysis Unit', [
            t('رئيس وحدة التخطيط والتحليل المالي', 'Financial Planning & Analysis Unit Head', 5, 'M'),
            t('أخصائي أول تخطيط وتحليل مالي', 'Senior Financial Planning & Analysis Specialist', 6, 'P'),
            t('أخصائي تخطيط وتحليل مالي', 'Financial Planning & Analysis Specialist', 7, 'P'),
            t('مشرف تخطيط وتحليل مالي', 'Financial Planning & Analysis Supervisor', 6, 'S'),
            t('قائد تخطيط وتحليل مالي', 'Financial Planning & Analysis Lead', 6, 'S'),
          ]),
          unit('وحدة الخزينة', 'Treasury Unit', [
            t('رئيس وحدة الخزينة', 'Treasury Unit Head', 5, 'M'),
            t('أخصائي أول خزينة', 'Senior Treasury Specialist', 6, 'P'),
            t('أخصائي خزينة', 'Treasury Specialist', 7, 'P'),
            t('مشرف خزينة', 'Treasury Supervisor', 6, 'S'),
            t('قائد خزينة', 'Treasury Lead', 6, 'S'),
          ]),
          unit('وحدة المحاسبة والتقارير المالية', 'Accounting & Financial Reporting Unit', [
            t('رئيس وحدة المحاسبة والتقارير المالية', 'Accounting & Financial Reporting Unit Head', 5, 'M'),
            t('أخصائي أول محاسبة', 'Senior Accounting Specialist', 6, 'P'),
            t('أخصائي محاسبة', 'Accounting Specialist', 7, 'P'),
            t('مشرف محاسبة', 'Accounting Supervisor', 6, 'S'),
            t('قائد محاسبة', 'Accounting Lead', 6, 'S'),
          ]),
        ]),
      ]),
    ])),
  top('CON',
      sector('قطاع الأعمال والاستشارات', 'Business & Consulting Sector', [], [
      office('مكتب قطاع الأعمال والاستشارات', 'Business & Consulting Sector Office', [
        t('مدير قطاع الأعمال والاستشارات', 'Business & Consulting Sector Director', 2, 'M'),
      ]),
      department('إدارة المعرفة والدراسات', 'Knowledge & Studies Department', [
        t('مدير إدارة المعرفة والدراسات', 'Knowledge & Studies Department Manager', 3, 'M'),
        t('أخصائي أول أبحاث', 'Senior Research Specialist', 6, 'P'),
        t('أخصائي أبحاث', 'Research Specialist', 7, 'P'),
        t('محلل أبحاث', 'Research Analyst', 7, 'P'),
      ]),
      department('إدارة التدريب وبناء القدرات', 'Training & Capacity Building Department', [
        t('مدير إدارة التدريب وبناء القدرات', 'Training & Capacity Building Department Manager', 3, 'M'),
        t('أخصائي أول تدريب', 'Senior Training Specialist', 6, 'P'),
        t('أخصائي تدريب', 'Training Specialist', 7, 'P'),
        t('منسق تدريب', 'Training Coordinator', 8, 'S'),
      ]),
      department('إدارة المنهجيات والجودة التقنية', 'Methodologies & Technical Quality Department', [
        t('مدير إدارة المنهجيات والجودة التقنية', 'Methodologies & Technical Quality Department Manager', 3, 'M'),
        t('أخصائي أول جودة تقنية', 'Senior Technical Quality Specialist', 6, 'P'),
        t('أخصائي جودة تقنية', 'Technical Quality Specialist', 7, 'P'),
        t('أخصائي منهجيات', 'Methodologies Specialist', 7, 'P'),
      ]),
      department('إدارة الاستشارات', 'Consulting Department', [
        t('مدير إدارة الاستشارات', 'Consulting Department Manager', 3, 'M'),
        t('مستشار رئيسي', 'Principal Consultant', 5, 'P'),
        t('مستشار أول', 'Senior Consultant', 6, 'P'),
        t('مستشار', 'Consultant', 7, 'P'),
      ]),
      department('إدارة تقييم الأسواق والمبادرات', 'Market & Initiative Assessment Department', [
        t('مدير إدارة تقييم الأسواق والمبادرات', 'Market & Initiative Assessment Department Manager', 3, 'M'),
        t('أخصائي أول تقييم', 'Senior Assessment Specialist', 6, 'P'),
        t('أخصائي تقييم', 'Assessment Specialist', 7, 'P'),
        t('محلل تقييم أسواق', 'Market Assessment Analyst', 7, 'P'),
      ]),
    ])),
  top('COM',
      department('إدارة التواصل المؤسسي', 'Corporate Communications Department', [
      t('مدير عام التواصل المؤسسي', 'Corporate Communications Director', 2, 'M'),
      t('مدير التواصل المؤسسي', 'Corporate Communications Manager', 3, 'M'),
      t('أخصائي أول تواصل مؤسسي', 'Senior Corporate Communications Specialist', 6, 'P'),
      t('أخصائي تواصل مؤسسي', 'Corporate Communications Specialist', 7, 'P'),
    ], [
      section('قسم الاتصال الداخلي والثقافة', 'Internal Communications & Culture Section', [
        t('رئيس قسم الاتصال الداخلي والثقافة', 'Internal Communications & Culture Section Head', 4, 'M'),
        t('أخصائي أول تواصل داخلي', 'Senior Internal Communications Specialist', 6, 'P'),
        t('أخصائي تواصل داخلي', 'Internal Communications Specialist', 7, 'P'),
        t('أخصائي ثقافة مؤسسية', 'Culture Specialist', 7, 'P'),
      ]),
      section('قسم التسويق والعلاقات العامة', 'Marketing & Public Relations Section', [
        t('رئيس قسم التسويق والعلاقات العامة', 'Marketing & Public Relations Section Head', 4, 'M'),
      ], [
        unit('وحدة التسويق', 'Marketing Unit', [
          t('رئيس وحدة التسويق', 'Marketing Unit Head', 5, 'M'),
          t('أخصائي أول تسويق', 'Senior Marketing Specialist', 6, 'P'),
          t('أخصائي تسويق', 'Marketing Specialist', 7, 'P'),
          t('مشرف تسويق', 'Marketing Supervisor', 6, 'S'),
          t('أخصائي تسويق رقمي', 'Digital Marketing Specialist', 7, 'P'),
          t('قائد تسويق', 'Marketing Lead', 6, 'S'),
        ]),
        unit('وحدة العلاقات العامة', 'Public Relations Unit', [
          t('رئيس وحدة العلاقات العامة', 'Public Relations Unit Head', 5, 'M'),
          t('أخصائي أول علاقات عامة', 'Senior Public Relations Specialist', 6, 'P'),
          t('أخصائي علاقات عامة', 'Public Relations Specialist', 7, 'P'),
          t('مشرف علاقات عامة', 'Public Relations Supervisor', 6, 'S'),
          t('قائد علاقات عامة', 'Public Relations Lead', 6, 'S'),
        ]),
        unit('وحدة إنتاج المحتوى والإبداع', 'Content & Creative Production Unit', [
          t('رئيس وحدة إنتاج المحتوى والإبداع', 'Content & Creative Production Unit Head', 5, 'M'),
          t('قائد إنتاج محتوى', 'Content Production Lead', 6, 'S'),
          t('كاتب محتوى', 'Content Writer', 7, 'P'),
          t('كاتب نصوص إعلانية', 'Copywriter', 7, 'P'),
          t('مصمم جرافيك', 'Graphic Designer', 7, 'P'),
          t('أخصائي إنتاج محتوى', 'Content Production Specialist', 7, 'P'),
        ]),
        unit('وحدة علاقات العملاء وأصحاب المصلحة', 'Client & Stakeholder Relations Unit', [
          t('رئيس وحدة علاقات العملاء وأصحاب المصلحة', 'Client & Stakeholder Relations Unit Head', 5, 'M'),
          t('أخصائي علاقات أصحاب المصلحة', 'Stakeholder Relations Specialist', 7, 'P'),
          t('مشرف علاقات عملاء', 'Client Relations Supervisor', 6, 'S'),
          t('أخصائي علاقات عملاء', 'Client Relations Specialist', 7, 'P'),
          t('قائد علاقات عملاء', 'Client Relations Lead', 6, 'S'),
        ]),
      ]),
    ])),
  top('STG',
      department('إدارة الاستراتيجية والحوكمة', 'Strategy & Governance Department', [
      t('مدير الاستراتيجية والحوكمة', 'Strategy & Governance Director', 2, 'M'),
      t('أخصائي أول استراتيجية', 'Senior Strategy Specialist', 6, 'P'),
      t('أخصائي استراتيجية', 'Strategy Specialist', 7, 'P'),
      t('محلل استراتيجية', 'Strategy Analyst', 7, 'P'),
    ])),
  top('EXE',
      office('مكتب الرئيس التنفيذي', 'Office of the CEO', [
      t('الرئيس التنفيذي', 'Chief Executive Officer (CEO)', 1, 'M'),
    ])),
];
