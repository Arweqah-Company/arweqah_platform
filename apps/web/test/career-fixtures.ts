import { EMPTY_CAREER_CONTENT, type CareerContent, type CareerTitleListItemDto, type MyCareerProfileDto } from '@arweqah-platform/shared';

/** A complete career path: every section has something to read. */
export const careerContent: CareerContent = {
  ...EMPTY_CAREER_CONTENT,
  summary: 'تنسيق ودعم أعمال وحدة الاستقطاب',
  kpis: [{ text: 'تحقيق مستهدف المقبولين', governing: true }, { text: 'معدل التحويل', governing: false }],
  responsibilities: [{ title: 'تحديد الفئة المستهدفة', tasks: ['تحليل المستهدفات', 'تحديد معايير الأهلية'] }],
  ladder: [{ level: 'L9', title: 'منسق الاستقطاب', current: true }, { level: 'L6', title: 'قائد فريق الاستقطاب', current: false }],
  transitionRule: 'إتقان الحالات القياسية باستقلال',
  pathUnit: 'إدارة التشغيل',
  pathTitle: 'منسق الاستقطاب',
  steps: [{ n: 1, label: 'الأساس المعرفي', title: 'دروب', meta: 'دورة · جهة' }],
  output: 'تنفيذ حملة اتصال',
  competencyColumns: ['L9 منسق', 'L5 رئيس'],
  competencies: [{ name: 'الاتصال المباشر', values: ['أساسي', 'خبير'] }],
  required: [{ when: '15 أكتوبر 2026', lines: ['أتأكد من مسماي'], deadline: '2026-10-15' }, { when: 'ما دمت في هذه الفترة', lines: ['لا أثر ماليا'], deadline: null }],
  ackText: 'اطلعت على الوصف الوظيفي لمسمى «منسق الاستقطاب»',
  learning: {
    badges: [{ name: 'وسام الأساس', condition: 'إتمام الإلزامي', hours: 35 }],
    rule: 'ويبلغ الموظف الوسام بإتمام شرطه',
    periods: [
      { name: 'السنة 1', units: [{ id: '11111111-1111-4111-8111-111111111111', priority: 'إلزامي', title: 'أمان العمل', provider: 'دروب', duration: 'ساعتان', minutes: 120, language: 'عربي', link: 'https://example.com/u1' }] },
      { name: 'السنة 2', units: [{ id: '22222222-2222-4222-8222-222222222222', priority: 'ضروري', title: 'الكتابة المهنية', provider: '', duration: '3 ساعات', minutes: 180, language: 'عربي', link: '' }] },
    ],
  },
};

export const myCareer = (over: Partial<MyCareerProfileDto> = {}): MyCareerProfileDto => ({
  available: true,
  titleId: 't1',
  titleCode: 'OPS.01.01.01-L9P-01',
  titleNameAr: 'منسق الاستقطاب',
  titleNameEn: 'Recruitment coordinator',
  grade: 9,
  track: 'P',
  unitCode: 'OPS.01.01.01',
  unitNameAr: 'وحدة الاستقطاب',
  unitNameEn: 'Recruitment unit',
  employeeName: 'منى الزهراني',
  managerName: 'فهد الدوسري',
  stage: { code: 'foundation', hoursPerYear: 40, budgetCap: 3000 },
  contentVersion: 3,
  content: careerContent,
  ackRequired: true,
  ackReason: 'first',
  acknowledgedAt: null,
  acknowledgedVersion: null,
  ...over,
});

export const careerRow = (over: Partial<CareerTitleListItemDto> = {}): CareerTitleListItemDto => ({
  id: 't1', code: 'OPS.01.01.01-L9P-01', nameAr: 'منسق الاستقطاب', nameEn: 'Recruitment coordinator', unitCode: 'OPS.01.01.01', unitNameAr: 'وحدة الاستقطاب', unitNameEn: 'Recruitment unit',
  grade: 9, track: 'P', status: 'draft', version: 2, holders: 3, updatedAt: '2026-11-08T10:00:00.000Z', ...over,
});
