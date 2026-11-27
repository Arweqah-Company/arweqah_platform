import { z } from 'zod';

/** What the screen says about itself when someone reports a problem (never the page's content: that is the screenshot, when the person keeps it). */
export const problemContextSchema = z.strictObject({
  pageTitle: z.string().trim().max(200),
  path: z.string().trim().max(300),
  language: z.enum(['ar', 'en']),
  theme: z.enum(['light', 'dark']),
  viewport: z.string().trim().max(30),
  browser: z.string().trim().max(300),
  appVersion: z.string().trim().max(60).default(''),
  /** The last failed calls to the platform: method, path and status, never a body. */
  failedRequests: z.array(z.strictObject({ method: z.string().trim().max(10), path: z.string().trim().max(200), status: z.number().int().min(0).max(599) })).max(5).default([]),
  /** The last errors the screen raised, as text. */
  errors: z.array(z.string().trim().max(300)).max(5).default([]),
});
export type ProblemContext = z.infer<typeof problemContextSchema>;

export const MAX_PROBLEM_NOTE = 1000;

/** The screenshot is uploaded first (`POST /files`) and named here; without `fileId` the report goes with the text alone. `title` empty = the page's name. */
export const createProblemReportSchema = z.strictObject({
  title: z.string().trim().max(200).default(''),
  note: z.string().trim().max(MAX_PROBLEM_NOTE).default(''),
  fileId: z.uuid().optional(),
  context: problemContextSchema,
  /** The person used the AI button (the audit line says so). */
  analyzed: z.boolean().default(false),
});
export type CreateProblemReportInput = z.infer<typeof createProblemReportSchema>;

/** «Analyse with the AI»: the screen's details, the note so far and (when kept) the screenshot already uploaded. */
export const analyzeProblemReportSchema = z.strictObject({
  note: z.string().trim().max(MAX_PROBLEM_NOTE).default(''),
  fileId: z.uuid().optional(),
  context: problemContextSchema,
});
export type AnalyzeProblemReportInput = z.infer<typeof analyzeProblemReportSchema>;

/** What the AI wrote: a title and the description, for the person to read and change; `imageSeen` = it looked at the screenshot. */
export interface ProblemReportAnalysisDto {
  title: string;
  description: string;
  imageSeen: boolean;
}

export const PROBLEM_REPORTS_PER_HOUR = { default: 10, min: 1, max: 60 } as const;

/** The settings of the «report a problem» button (Settings → Problem reports). */
export const problemReportSettingsSchema = z.strictObject({
  enabled: z.boolean(),
  /** The ticket type every report becomes; null = none chosen yet (the button stays hidden). */
  ticketTypeId: z.uuid().nullable(),
  /** Show the «Analyse with the AI» button in the report window (the AI writes the title and the description for the person to change). */
  analyzeWithAi: z.boolean(),
  /** Let the AI service also see the screenshot (it leaves the platform); off = it reads the text and the context only. */
  sendImageToAi: z.boolean(),
  maxPerHour: z.number().int().min(PROBLEM_REPORTS_PER_HOUR.min).max(PROBLEM_REPORTS_PER_HOUR.max),
});
export type ProblemReportSettingsInput = z.infer<typeof problemReportSettingsSchema>;
export type ProblemReportSettingsDto = ProblemReportSettingsInput;

/** The button is shown only while this says yes. */
export interface ProblemReportAvailabilityDto {
  available: boolean;
  /** The «Analyse with the AI» button shows: the analysis is on and an AI service is on. */
  canAnalyze: boolean;
  /** Whether the screenshot may go to the AI service (the dialog says it before sending). */
  imageToAi: boolean;
}

export interface ProblemReportResultDto {
  ticketId: string;
  ticketNumber: number;
}

/** One ticket type the administrator may choose for the reports, with its department. */
export interface ProblemReportTypeOptionDto {
  typeId: string;
  nameAr: string;
  nameEn: string;
  deskNameAr: string;
  deskNameEn: string;
}
