import { reminderSchema, type ReminderDto, type ReminderInput, type ReminderKind } from '@arweqah-platform/shared';

/** A reminder as the form holds it: the days as the text typed (a list for the employee's reminder, one number for the others). */
export interface ReminderDraft {
  kind: ReminderKind;
  on: boolean;
  days: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

export const emptyDraft = (): ReminderDraft => ({ kind: 'self', on: true, days: '', titleAr: '', titleEn: '', bodyAr: '', bodyEn: '' });
export const toDraft = (r: ReminderDto): ReminderDraft => ({ kind: r.kind, on: r.on, days: r.days.join(', '), titleAr: r.titleAr, titleEn: r.titleEn, bodyAr: r.bodyAr, bodyEn: r.bodyEn });

/** The days typed as «7, 3, 1»: a piece that is not a number stays NaN so the rule refuses it; empty pieces are dropped. */
/** Arabic-Indic and Persian digits as Latin ones, so «٧، ٣، ١» is read as 7, 3, 1. */
const latinDigits = (s: string): string => s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0xf));
const daysOf = (text: string): number[] => latinDigits(text).split(/[,\u060C]/).map((x) => x.trim()).filter(Boolean).map(Number);

/** What the form sends, from the draft; the employee's reminder takes a list of days, the others the one number. */
export const candidateOf = (d: ReminderDraft): unknown => ({ kind: d.kind, on: d.on, days: d.kind === 'self' ? daysOf(d.days) : daysOf(d.days).slice(0, 1), titleAr: d.titleAr, titleEn: d.titleEn, bodyAr: d.bodyAr, bodyEn: d.bodyEn });

export type ReminderField = 'days' | 'titleAr' | 'titleEn' | 'bodyAr' | 'bodyEn';

/** The fields the rule refuses, and the reminder to send when it accepts. */
export function checkDraft(d: ReminderDraft): { input: ReminderInput | null; bad: Set<ReminderField> } {
  const parsed = reminderSchema.safeParse(candidateOf(d));
  if (parsed.success) return { input: parsed.data, bad: new Set() };
  return { input: null, bad: new Set(parsed.error.issues.map((i) => (typeof i.path[0] === 'string' ? i.path[0] : 'days') as ReminderField)) };
}
