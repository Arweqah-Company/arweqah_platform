import { z } from 'zod';
import type { ReminderDto } from './reminders';
import type { FiscalCard, GradeBand, StageTemplate } from './template';

/**
 * The evaluation cycle (FR-118; plan §3.1, §3.7). One cycle per fiscal year, seven stages one after the other; HR opens it, moves it on and closes it.
 * `none` (no cycle yet) is the absence of a cycle, so the stored stages start at `self`.
 */
export const CYCLE_STAGES = ['self', 'mgr', 'cal', 'appr', 'notif', 'obj', 'closed'] as const;
export type CycleStage = (typeof CYCLE_STAGES)[number];

/** The dates of a cycle: the first five follow one another (each starts no earlier than the one before ends); the others stand on their own: the self-evaluation deadline, the close of the qualitative part and the four milestones of the year (the dates HR sets for them). */
export const CYCLE_DATE_KEYS = ['final', 'calibration', 'approval', 'notification', 'objection', 'self_deadline', 'qualitative_close', 'review_jan', 'pulse_mar', 'review_jul', 'pulse_sep'] as const;
export type CycleDateKey = (typeof CYCLE_DATE_KEYS)[number];
export const CYCLE_DATE_CHAIN: readonly CycleDateKey[] = ['final', 'calibration', 'approval', 'notification', 'objection'];

export const CATALOG_KINDS = ['init', 'growth'] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export const CATALOG_POINTS_MAX = 10;
export const CATALOG_TITLE_MIN = 3;
/** The caps of the two catalog kinds when no stage template says otherwise (the formula of plan §3.3: initiatives 10, growth 5). */
export const CATALOG_CAPS_DEFAULT = { init: 10, growth: 5 } as const;

export const openCycleSchema = z.strictObject({ fiscalYear: z.number().int().min(2020).max(2100) });
export type OpenCycleInput = z.infer<typeof openCycleSchema>;

/** `PUT /performance/cycle/dates/:key`: «from» is required, «to» is optional (a single day). */
export const setCycleDateSchema = z.strictObject({ from: z.iso.date(), to: z.iso.date().nullable().default(null) });
export type SetCycleDateInput = z.infer<typeof setCycleDateSchema>;

export const catalogItemSchema = z.strictObject({
  kind: z.enum(CATALOG_KINDS),
  title: z.string().trim().min(CATALOG_TITLE_MIN).max(160),
  points: z.number().int().min(1).max(CATALOG_POINTS_MAX),
});
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

export interface CycleDate {
  key: CycleDateKey;
  from: string;
  to: string | null;
}

/** Why a date cannot be set: its end is before its start, or it starts before the stage ahead of it ends, or ends after the one behind it starts. */
export const CYCLE_DATE_PROBLEMS = ['end_before_start', 'before_previous', 'after_next'] as const;
export type CycleDateProblem = (typeof CYCLE_DATE_PROBLEMS)[number];

export interface CatalogItemDto {
  id: string;
  kind: CatalogKind;
  title: string;
  points: number;
}

/** The checklist before opening: the five stage templates, the grade scale, the fiscal card, and how many catalog items there are. */
export interface ReadinessDto {
  stages: { stage: number; ready: boolean }[];
  scale: boolean;
  fiscal: boolean;
  catalogItems: number;
  /** Everything that must be there to open is there (the catalog may be empty). */
  ready: boolean;
}

/** What a cycle freezes when it opens, so a later change of the templates cannot change a year that began. */
export interface TemplateSnapshot {
  stages: StageTemplate[];
  scale: GradeBand[];
  fiscal: FiscalCard;
}

export interface CycleDto {
  id: string;
  fiscalYear: number;
  stage: CycleStage;
  openedAt: string;
  closedAt: string | null;
}

/** Whose dates the page shows: the cycle in progress, or the next one when none is open (HR may prepare them before opening). */
export type CycleDatesFor = 'cycle' | 'next';

export interface CycleStateDto {
  /** The cycle in progress, or the one closed last; null before any cycle was opened. */
  cycle: CycleDto | null;
  readiness: ReadinessDto;
  catalog: CatalogItemDto[];
  /** The seven dates, always all of them: what HR set, else the usual date of the fiscal year (`defaultCycleDates` on the server). */
  dates: CycleDate[];
  datesFor: CycleDatesFor;
  /** The fiscal year of the next cycle: the year its April falls in (the dialog of opening starts with it). */
  nextFiscalYear: number;
  /** The automatic reminders HR keeps (the sending is a later delivery). */
  reminders: ReminderDto[];
  /** How many people hold the calibration key and the approval key: zero is a warning on the readiness card (it does not stop the cycle from opening). */
  holders: { calibrate: number; approve: number };
  /** The caps of the two catalog kinds, from the first stage template that is kept (else the defaults). */
  catalogCaps: { init: number; growth: number };
}
