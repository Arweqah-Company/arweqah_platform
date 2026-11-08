import { EMPTY_CAREER_CONTENT, type CareerContent } from '@arweqah-platform/shared';

/** A career-path document with every section complete: it can be set ready. */
export const complete: CareerContent = {
  ...EMPTY_CAREER_CONTENT,
  summary: 'تنسيق ودعم أعمال وحدة الاستقطاب',
  kpis: [{ text: 'تحقيق مستهدف المقبولين', governing: true }, { text: 'معدل التحويل', governing: false }],
  responsibilities: [{ title: 'تحديد الفئة المستهدفة', tasks: ['تحليل المستهدفات', 'تحديد معايير الأهلية'] }],
  ladder: [{ level: 'L9', title: 'منسق الاستقطاب', current: true }, { level: 'L6', title: 'قائد فريق الاستقطاب', current: false }],
  transitionRule: 'إتقان الحالات القياسية باستقلال',
  pathUnit: 'إدارة التشغيل · وحدة الاستقطاب',
  pathTitle: 'منسق الاستقطاب',
  steps: [{ n: 1, label: 'الأساس المعرفي', title: 'دروب', meta: 'دورة · جهة' }],
  competencyColumns: ['L9 منسق الاستقطاب', 'L5 رئيس وحدة'],
  competencies: [{ name: 'الاتصال المباشر', values: ['أساسي', 'خبير'] }],
  required: [{ when: '15 أكتوبر 2026', lines: ['أتأكد من مسماي وكودي'], deadline: '2026-10-15' }],
  ackText: 'اطلعت على الوصف الوظيفي لمسمى «منسق الاستقطاب»',
  learning: {
    badges: [{ name: 'وسام الأساس', condition: 'إتمام الإلزامي', hours: 35 }],
    rule: 'ويبلغ الموظف الوسام بإتمام شرطه',
    periods: [{ name: 'السنة 1', units: [{ priority: 'إلزامي', title: 'أمان العمل', provider: 'دروب', duration: 'ساعتان', minutes: 120, language: 'عربي', link: '' }] }],
  },
};
