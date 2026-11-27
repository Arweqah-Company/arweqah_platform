import type { ProblemReportSettingsDto } from '@arweqah-platform/shared';

const HOUR_MS = 3_600_000;

/** The start of the hour the limit counts. */
export const windowStart = (now: Date): Date => new Date(now.getTime() - HOUR_MS);

/** The person may send one more report. */
export const withinLimit = (recent: number, max: number): boolean => recent < max;

/** The button works only while it is on and a ticket type was chosen. */
export const isReady = (settings: Pick<ProblemReportSettingsDto, 'enabled' | 'ticketTypeId'>): boolean => settings.enabled && settings.ticketTypeId !== null;

/** Whether the screenshot goes to the AI service: the analysis is on and the administrator allowed pictures. */
export const imageMayGoToAi = (settings: Pick<ProblemReportSettingsDto, 'analyzeWithAi' | 'sendImageToAi'>): boolean => settings.analyzeWithAi && settings.sendImageToAi;

/** Plain text from the model: control characters out, blank lines collapsed, cut to the limit. Shown only as text, never as markup. */
export function cleanModelText(value: string, max: number): string {
  const plain = [...value]
    .filter((ch) => ch === '\t' || ch === '\n' || ch === '\r' || (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127))
    .join('')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}
