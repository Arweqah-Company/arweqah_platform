import { CorePermission, type CycleDate, type CycleStage, type CycleStateDto, type EvalFileResult, type ReminderDto, type StageTemplate, type TemplatesDto } from '@arweqah-platform/shared';

/** The keys of someone who runs the evaluation cycle (HR). */
export const CYCLE_KEYS = [CorePermission.PerformanceCycleView, CorePermission.PerformanceCycleManage, CorePermission.PerformanceCycleClose, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceCatalogManage, CorePermission.PerformanceCatalogExport, CorePermission.PerformanceRemindersManage, CorePermission.PerformanceRemindersExport, CorePermission.PerformanceTemplateEdit, CorePermission.PerformanceTemplateExport, CorePermission.PerformanceTemplateAi];

/** The usual dates of the fiscal year 2026 (what the server gives while HR changed none). */
export const DATES: CycleDate[] = [
  { key: 'final', from: '2027-04-15', to: '2027-04-20' },
  { key: 'calibration', from: '2027-04-21', to: '2027-04-24' },
  { key: 'approval', from: '2027-04-27', to: null },
  { key: 'notification', from: '2027-04-30', to: null },
  { key: 'objection', from: '2027-05-03', to: '2027-05-07' },
  { key: 'self_deadline', from: '2027-03-10', to: null },
  { key: 'qualitative_close', from: '2027-03-25', to: null },
];

export const REMINDERS: ReminderDto[] = [
  { id: 'r1', kind: 'self', on: true, days: [7, 3, 1], titleAr: 'تذكير بالتقييم الذاتي', titleEn: 'Self-evaluation reminder', bodyAr: 'لم ترسل تقييمك الذاتي بعد.', bodyEn: 'You have not sent your self-evaluation yet.' },
  { id: 'r2', kind: 'mgr', on: true, days: [2], titleAr: 'تقييم ينتظر مراجعتك', titleEn: '', bodyAr: 'عندك تقييمات تنتظر مراجعتك.', bodyEn: '' },
  { id: 'r3', kind: 'mile', on: false, days: [3], titleAr: 'محطة قريبة', titleEn: '', bodyAr: 'اقترب موعد محطة من محطات السنة.', bodyEn: '' },
];

/** A sound stage template: 60/40 basic, three extra components (cap 125), four criteria of 25 and four behaviours with their questions. */
export function stageTemplate(stage: number, over: Partial<StageTemplate> = {}): StageTemplate {
  return {
    stage, name: ['', 'التأسيس', 'التخصص', 'البراعة', 'القيادة التشغيلية', 'القيادة المؤسسية'][stage]!, resultsWeight: 60, behaviourWeight: 40, basicTotal: 100,
    extra: [{ name: 'تعلم', points: 10 }, { name: 'مبادرات داخلية', points: 10 }, { name: 'مساهمة في النمو', points: 5 }], cap: 125, ruleText: 'يقيّم المدير المباشر', resultsNote: 'ما تعنيه النتائج',
    criteria: [1, 2, 3, 4].map((i) => ({ name: `معيار ${i}`, share: 25 })), behaviours: [1, 2, 3, 4].map((i) => ({ code: `B${stage}.${i}`, name: `سلوك ${i}`, question: `سؤال ${i}` })), ...over,
  };
}

export const SCALE = [
  { name: 'استثنائي', range: '110 فأكثر', from: 110, to: null, description: 'أداء استثنائي' },
  { name: 'يفوق التوقعات', range: '95 إلى 109.9', from: 95, to: 109.9, description: 'يفوق' },
  { name: 'يحقق التوقعات', range: '80 إلى 94.9', from: 80, to: 94.9, description: 'يحقق' },
  { name: 'يحتاج تحسينًا', range: '65 إلى 79.9', from: 65, to: 79.9, description: 'يحتاج' },
  { name: 'دون التوقعات', range: 'أقل من 65', from: null, to: 65, description: 'دون' },
];
export const FISCAL = { months: ['أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس'].map((month, i) => ({ month, kind: i % 3 === 0 ? 'محطة' : 'متابعة يومية' })), notes: [{ month: 'أبريل', text: 'ملاحظة على شهر أبريل' }] };
/** The evaluation file kept: stages 1 and 2, the scale and the card; stages 3 to 5 are not uploaded. */
export const TEMPLATES: TemplatesDto = { stages: [stageTemplate(1), stageTemplate(2)], scale: SCALE, fiscal: FISCAL };
export const READY = { stages: [1, 2, 3, 4, 5].map((stage) => ({ stage, ready: true })), scale: true, fiscal: true, catalogItems: 2, ready: true };
export const NOT_READY = { ...READY, stages: READY.stages.map((s) => ({ ...s, ready: s.stage < 3 })), ready: false };
export const CATALOG = [{ id: 'i1', kind: 'init' as const, title: 'قيادة مبادرة تحسين', points: 4 }, { id: 'i2', kind: 'growth' as const, title: 'مساهمة في ورشة', points: 2 }];

/** The state the page loads: a cycle at `stage` (null for none) with the seven dates, the reminders and the catalog. */
export function cycleState(stage: CycleStage | null, over: Partial<CycleStateDto> = {}): CycleStateDto {
  return {
    cycle: stage ? { id: 'c1', fiscalYear: 2026, stage, openedAt: '2026-11-09T10:00:00.000Z', closedAt: stage === 'closed' ? '2026-11-10T10:00:00.000Z' : null } : null,
    readiness: READY,
    catalog: CATALOG,
    dates: DATES,
    datesFor: stage && stage !== 'closed' ? 'cycle' : 'next',
    nextFiscalYear: 2026,
    reminders: REMINDERS,
    catalogCaps: { init: 10, growth: 5 },
    ...over,
  };
}

/** One stage of an evaluation file as the server reports it: the weights, the criteria and behaviours counts and the cap, with the failed checks. */
export function stageResult(stage: number, problems: string[] = [], over: { results?: number; behaviour?: number; criteria?: number; behaviours?: number; cap?: number } = {}): EvalFileResult['stages'][number] {
  const list = (n: number) => Array.from({ length: n }, (_, i) => i);
  return {
    stage, name: ['', 'التأسيس', 'التخصص', 'البراعة', 'القيادة التشغيلية', 'القيادة المؤسسية'][stage]!, problems: problems as never,
    template: { stage, name: '', resultsWeight: over.results ?? 60, behaviourWeight: over.behaviour ?? 40, basicTotal: 100, extra: [], cap: over.cap ?? 125, ruleText: '', resultsNote: '', criteria: list(over.criteria ?? 4).map((i) => ({ name: `c${i}`, share: 25 })), behaviours: list(over.behaviours ?? 4).map((i) => ({ code: `B${i}`, name: `b${i}`, question: 'q' })) },
  };
}

/** What an evaluation file holds: the stages, a grade scale of `levels` levels and a card of `months` months. */
export function evalResult(stages: EvalFileResult['stages'], levels = 5, months = 12): EvalFileResult {
  const bands = Array.from({ length: levels }, (_, i) => ({ name: `n${i}`, range: `${i}`, from: i, to: null, description: '' }));
  const card = { months: Array.from({ length: months }, (_, i) => ({ month: `m${i}`, kind: 'محطة' })), notes: [{ month: 'm1', text: 'x' }, { month: 'm2', text: 'y' }] };
  return { stages, scale: levels ? { bands, problems: [] } : null, fiscal: months ? { card, problems: [] } : null, ignored: [], saved: false };
}
