/** Sample structure for development, one chain per department: sector > department > section > unit (with job titles). */
interface Names {
  ar: string;
  en: string;
}

export interface DemoUnit {
  section: Names;
  unit: Names;
  titles: Names[];
}

export interface DemoDepartment {
  department: Names;
  units: DemoUnit[];
}

export const DEMO_SECTOR: Names = { ar: 'القطاع التنفيذي', en: 'Executive Sector' };

export const DEMO_DEPARTMENTS: DemoDepartment[] = [
  {
    department: { ar: 'إدارة الموارد البشرية', en: 'Human Resources Department' },
    units: [
      {
        section: { ar: 'قسم شؤون الموظفين', en: 'Employee Affairs Section' },
        unit: { ar: 'وحدة التوظيف', en: 'Recruitment Unit' },
        titles: [
          { ar: 'أخصائي توظيف', en: 'Recruitment Specialist' },
          { ar: 'منسق توظيف', en: 'Recruitment Coordinator' },
        ],
      },
    ],
  },
  {
    department: { ar: 'إدارة تقنية المعلومات', en: 'Information Technology Department' },
    units: [
      {
        section: { ar: 'قسم التطوير', en: 'Development Section' },
        unit: { ar: 'وحدة تطوير الويب', en: 'Web Development Unit' },
        titles: [
          { ar: 'مطور برمجيات', en: 'Software Developer' },
          { ar: 'قائد فريق', en: 'Team Lead' },
        ],
      },
    ],
  },
];
