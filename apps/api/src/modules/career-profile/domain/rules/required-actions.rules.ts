export interface ParsedRequiredActions {
  items: { when: string; lines: string[]; deadline: string | null }[];
  acknowledgement: string;
  ignored: string[];
}

const MONTHS: Readonly<Record<string, number>> = { يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, مايو: 5, يونيو: 6, يوليو: 7, أغسطس: 8, سبتمبر: 9, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12 };
const MONTH_AND_YEAR = /(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s*(\d{4})/g;
const DAY_BEFORE = /(\d{1,2})\s+و?$/;
/** A heading is a short line (the field of the career content holds 160 characters). */
const HEADING_MAX = 160;

/**
 * Reads «المطلوب»: each item starts with a line that ends in a year (or says «ما دمت في هذه الفترة») and holds the lines under it; the last
 * line, «اطلعت على…», is the acknowledgement sentence.
 */
export function parseRequiredActions(all: readonly string[]): ParsedRequiredActions {
  const start = all.indexOf('المطلوب');
  const lines = start >= 0 ? all.slice(start + 1) : all;
  const out: ParsedRequiredActions = { items: [], acknowledgement: '', ignored: [] };
  let current: ParsedRequiredActions['items'][number] | null = null;
  for (const line of lines) {
    if (/^اطلعت على/.test(line)) out.acknowledgement = line;
    else if (isHeading(line)) {
      current = { when: line, lines: [], deadline: deadlineOf(line) };
      out.items.push(current);
    } else if (current) current.lines.push(line);
    else out.ignored.push(line);
  }
  return out;
}

const isHeading = (line: string): boolean => line.length <= HEADING_MAX && (/\d{4}$/.test(line) || /^ما دمت/.test(line));

/** The last date of a heading as `YYYY-MM-DD`: a day and a month, or a month alone (its last day); null when there is none. */
export function deadlineOf(heading: string): string | null {
  const dates = [...heading.matchAll(MONTH_AND_YEAR)];
  const last = dates[dates.length - 1];
  if (!last) return null;
  const year = Number(last[2]);
  const month = MONTHS[last[1] as string] as number;
  const dayText = DAY_BEFORE.exec(heading.slice(0, last.index))?.[1];
  const day = dayText ? Number(dayText) : new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
