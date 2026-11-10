import type { CycleDateKey, CycleStage } from '@arweqah-platform/shared';

/** Audit action names of the performance module (their wording for people is in the shared audit catalog). */
export const PERFORMANCE_AUDIT = {
  templateSaved: 'performance.template.saved',
  fileAnalysedAi: 'performance.template.file_ai',
  cycleOpened: 'performance.cycle.opened',
  cycleAdvanced: 'performance.cycle.advanced',
  cycleClosed: 'performance.cycle.closed',
  cycleDateSet: 'performance.cycle.date_set',
  reminderCreated: 'performance.reminder.created',
  reminderUpdated: 'performance.reminder.updated',
  reminderRemoved: 'performance.reminder.removed',
  stageSaved: 'performance.template.stage_saved',
  stageRemoved: 'performance.template.stage_removed',
  scaleSaved: 'performance.template.scale_saved',
  fiscalSaved: 'performance.template.fiscal_saved',
  catalogAdded: 'performance.catalog.added',
  catalogRemoved: 'performance.catalog.removed',
  selfSent: 'performance.self.sent',
  selfEdited: 'performance.self.edited',
  teamSaved: 'performance.team.saved',
  teamSent: 'performance.team.sent',
  teamEdited: 'performance.team.edited',
} as const;

export const PERFORMANCE_TEMPLATE_ENTITY = 'performance_template';
export const PERFORMANCE_CYCLE_ENTITY = 'performance_cycle';
export const PERFORMANCE_CATALOG_ENTITY = 'performance_catalog_item';
export const PERFORMANCE_REMINDER_ENTITY = 'performance_reminder';
export const PERFORMANCE_EVALUATION_ENTITY = 'performance_evaluation';

/** The names of the dates of a cycle, for the notice that one of them changed. */
export const CYCLE_DATE_LABELS: Record<CycleDateKey, { ar: string; en: string }> = {
  final: { ar: 'الختامي النهائي بعد إقفال الأرقام', en: 'Final close after the numbers are locked' },
  calibration: { ar: 'لقاءا المعايرة', en: 'Calibration meetings' },
  approval: { ar: 'الاعتماد', en: 'Approval' },
  notification: { ar: 'الإبلاغ الفردي', en: 'Individual notification' },
  objection: { ar: 'نافذة الاعتراض', en: 'Objection window' },
  self_deadline: { ar: 'آخر موعد للتقييم الذاتي', en: 'Self-evaluation deadline' },
  qualitative_close: { ar: 'إغلاق الختامي النوعي', en: 'Close of the qualitative part' },
};

/** The AI analysis of an evaluation file: six a person an hour (it costs money), and the room the model may use for its answer. */
export const EVAL_FILE_AI_PER_HOUR = 6;
export const EVAL_FILE_AI_WINDOW_MS = 3_600_000;
export const EVAL_FILE_AI_MAX_TOKENS = 64_000;

/** What each stage tells the people who work in it when the cycle moves into it: who is told (the evaluated employees, their direct managers, or both) and the words. Calibration and approval have no holder to tell yet (delivery 5b). */
export const STAGE_NOTICES: Partial<Record<CycleStage, { to: 'employees' | 'managers' | 'both'; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string; link: string }>> = {
  mgr: { to: 'managers', link: '/career-team', titleAr: 'بدأت مرحلة تقييم المدير', titleEn: "The manager's evaluation stage began", bodyAr: 'راجع التقييمات الذاتية لفريقك وأدخل درجاتك.', bodyEn: "Review your team's self-evaluations and enter your scores." },
  notif: { to: 'employees', link: '/career-profile', titleAr: 'بدأت مرحلة الإبلاغ الفردي', titleEn: 'The individual notification stage began', bodyAr: 'تصلك نتيجة تقييمك فرديًا في قسم «تقييم الأداء» من مسارك الوظيفي.', bodyEn: 'Your result reaches you individually in the «performance evaluation» section of your career path.' },
  obj: { to: 'employees', link: '/career-profile', titleAr: 'فُتحت نافذة الاعتراض', titleEn: 'The objection window is open', bodyAr: 'يمكنك الاعتراض مرة واحدة على بند من تقييمك بسبب مكتوب.', bodyEn: 'You may object once to an item of your evaluation, with a written reason.' },
  closed: { to: 'both', link: '/career-profile', titleAr: 'أُغلقت دورة تقييم الأداء', titleEn: 'The performance evaluation cycle is closed', bodyAr: 'بقيت النتائج في سجل كل موظف.', bodyEn: "The results stay in each employee's record." },
};
