import { z } from 'zod';

/**
 * The career-path content of one job title (FR-111, FR-113; plan `docs/plans/phase-6-career-path-performance.md` §2.2, §4).
 * One document per title: the job description, the career development (ladder, level path, technical competencies) and the required
 * actions with the acknowledgement sentence. The text is written once, in the language of the title file (Arabic); the learning plan
 * has its own tables and the performance evaluation belongs to the development stage, not to the title.
 */
const line = (max: number) => z.string().trim().min(1).max(max);

export const CAREER_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'] as const;
export const CAREER_STEP_MAX = 9;
export const CAREER_KPI_MAX = 30;
export const CAREER_GROUP_MAX = 40;
export const CAREER_TASK_MAX = 30;
export const CAREER_COMPETENCY_MAX = 60;
export const CAREER_COLUMN_MAX = 12;
export const CAREER_REQUIRED_MAX = 30;

export const careerKpiSchema = z.strictObject({ text: line(300), governing: z.boolean() });
export const careerResponsibilitySchema = z.strictObject({ title: line(200), tasks: z.array(line(400)).max(CAREER_TASK_MAX) });
export const careerLadderStepSchema = z.strictObject({ level: z.enum(CAREER_LEVELS), title: line(120), current: z.boolean() });
export const careerPathStepSchema = z.strictObject({ n: z.number().int().min(1).max(CAREER_STEP_MAX), label: line(80), title: line(300), meta: line(300) });
export const careerCompetencySchema = z.strictObject({ name: line(120), values: z.array(z.string().trim().max(40)).max(CAREER_COLUMN_MAX) });
export const careerRequiredItemSchema = z.strictObject({
  when: line(160),
  lines: z.array(line(400)).max(10),
  /** The last date in `when` (a month alone means its last day); null for «as long as you are in this period». */
  deadline: z.iso.date().nullable(),
});

export const LEARNING_PRIORITIES = ['إلزامي', 'ضروري', 'أساسي'] as const;
/** The languages a learning unit is offered in (the words the title files use). */
export const LEARNING_LANGUAGES = ['عربي', 'إنجليزي'] as const;
/** The value of a competency at one level; «—» means it is not part of that level. */
export const COMPETENCY_VALUES = ['أساسي', 'خبير', 'غير مطلوبة', '—'] as const;
export const LEARNING_PERIOD_MAX = 10;
export const LEARNING_UNIT_MAX = 60;
export const LEARNING_BADGE_MAX = 8;

/** A learning unit of a title's plan. `id` is given by the server when a unit is first saved and stays with it (the employee's progress will point at it). */
export const careerLearningUnitSchema = z.strictObject({
  id: z.uuid().optional(),
  priority: z.enum(LEARNING_PRIORITIES),
  title: line(300),
  provider: z.string().trim().max(300),
  /** As written («3 ساعات و12 دقيقة»). */
  duration: line(60),
  /** What `duration` means in minutes; zero is a duration nobody understood and cannot be saved. */
  minutes: z.number().int().min(1).max(6000),
  language: line(30),
  /** Where the employee opens the unit: empty, or an https address. */
  link: z.union([z.literal(''), z.url({ protocol: /^https$/ }).max(500)]),
});
export const careerLearningPeriodSchema = z.strictObject({ name: line(80), units: z.array(careerLearningUnitSchema).max(LEARNING_UNIT_MAX) });
export const careerLearningBadgeSchema = z.strictObject({ name: line(120), condition: line(300), hours: z.number().int().min(1).max(2000) });
export const careerLearningSchema = z.strictObject({
  badges: z.array(careerLearningBadgeSchema).max(LEARNING_BADGE_MAX),
  /** How the badges are awarded, in the file's words. */
  rule: z.string().trim().max(1000),
  periods: z.array(careerLearningPeriodSchema).max(LEARNING_PERIOD_MAX),
});
export type CareerLearning = z.infer<typeof careerLearningSchema>;
export const EMPTY_CAREER_LEARNING: CareerLearning = { badges: [], rule: '', periods: [] };

export const careerContentSchema = z.strictObject({
  summary: z.string().trim().max(2000),
  kpis: z.array(careerKpiSchema).max(CAREER_KPI_MAX),
  responsibilities: z.array(careerResponsibilitySchema).max(CAREER_GROUP_MAX),
  ladder: z.array(careerLadderStepSchema).max(CAREER_LEVELS.length),
  transitionRule: z.string().trim().max(600),
  pathUnit: z.string().trim().max(200),
  pathTitle: z.string().trim().max(200),
  steps: z.array(careerPathStepSchema).max(CAREER_STEP_MAX),
  output: z.string().trim().max(600),
  certificates: z.string().trim().max(600),
  competencyColumns: z.array(line(40)).max(CAREER_COLUMN_MAX),
  competencies: z.array(careerCompetencySchema).max(CAREER_COMPETENCY_MAX),
  required: z.array(careerRequiredItemSchema).max(CAREER_REQUIRED_MAX),
  ackText: z.string().trim().max(500),
  /** The learning plan (documents saved before it existed read as an empty one). */
  learning: careerLearningSchema.default(EMPTY_CAREER_LEARNING),
});
export type CareerContent = z.infer<typeof careerContentSchema>;

/** `PUT /career/titles/:id/content`: the whole document; `expectedVersion` makes a stale save a 409 instead of overwriting a newer one. */
export const saveCareerContentSchema = z.strictObject({
  content: careerContentSchema,
  expectedVersion: z.number().int().min(0).optional(),
});
export type SaveCareerContentInput = z.infer<typeof saveCareerContentSchema>;

export const CAREER_CONTENT_STATUSES = ['draft', 'ready'] as const;
export type CareerContentStatus = (typeof CAREER_CONTENT_STATUSES)[number];

/** Why a title cannot be set «ready» yet: each code is one section that is incomplete. */
export const CAREER_READINESS_PROBLEMS = ['description', 'development', 'learning', 'required'] as const;
export type CareerReadinessProblem = (typeof CAREER_READINESS_PROBLEMS)[number];

export const EMPTY_CAREER_CONTENT: CareerContent = {
  summary: '',
  kpis: [],
  responsibilities: [],
  ladder: [],
  transitionRule: '',
  pathUnit: '',
  pathTitle: '',
  steps: [],
  output: '',
  certificates: '',
  competencyColumns: [],
  competencies: [],
  required: [],
  ackText: '',
  learning: EMPTY_CAREER_LEARNING,
};

export interface CareerTitleContentDto {
  titleId: string;
  titleCode: string | null;
  titleNameAr: string;
  titleNameEn: string;
  /** 0 = nothing saved yet (the content is empty); grows by one with every save. */
  version: number;
  status: CareerContentStatus;
  content: CareerContent;
  /** What still stops the title from being set ready (empty = it can be). */
  problems: CareerReadinessProblem[];
  updatedAt: string | null;
}
