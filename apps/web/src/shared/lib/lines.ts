import type { LocalizedList, LocalizedText } from '@arweqah-platform/shared';

/** One item per line: the text of a box becomes the list, with empty lines dropped. */
export const linesOf = (text: string): string[] => text.split('\n').map((line) => line.trim()).filter(Boolean);

export const textOfLines = (lines: readonly string[]): string => lines.join('\n');

/** The lines in the reader's language, or the other language's when that one was left empty. */
export function pickLines(list: LocalizedList, ar: boolean): string[] {
  const own = ar ? list.ar : list.en;
  return own.length > 0 ? own : ar ? list.en : list.ar;
}

/** The text in the reader's language, or the other language's when that one was left empty. */
export const pickText = (text: LocalizedText, ar: boolean): string => (ar ? text.ar || text.en : text.en || text.ar);

/** Today in the platform's own time zone (what the API counts as «today» for a start date). */
export const todayInRiyadh = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

export type ListProblem = 'tooMany' | 'tooLong';

/** What is wrong with a list in one language: more lines than allowed, or a line longer than allowed; undefined when it is fine. */
export function listProblem(lines: readonly string[], limits: { maxItems: number; maxLength: number }): ListProblem | undefined {
  if (lines.length > limits.maxItems) return 'tooMany';
  return lines.some((line) => line.length > limits.maxLength) ? 'tooLong' : undefined;
}
