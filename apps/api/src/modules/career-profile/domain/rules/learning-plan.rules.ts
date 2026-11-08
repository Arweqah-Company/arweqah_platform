import { durationMinutes } from './learning-duration.rules';
import { lineAt } from './title-file-lines.rules';

export interface ParsedLearningUnit {
  priority: string;
  title: string;
  provider: string;
  duration: string;
  minutes: number;
  language: string;
}
export interface ParsedLearningPeriod {
  name: string;
  /** The total the file's own header states for the period («13 وحدة · 39 ساعة و18 دقيقة»), when it has one. */
  header: { count: number; text: string; minutes: number } | null;
  units: ParsedLearningUnit[];
}
export interface ParsedLearningPlan {
  hoursDone: number;
  badges: { name: string; condition: string; hours: number }[];
  rule: string;
  periods: ParsedLearningPeriod[];
  ignored: string[];
}

const PRIORITIES: readonly string[] = ['إلزامي', 'ضروري', 'أساسي'];
const COLUMN_HEADINGS: readonly string[] = ['الأولوية', 'الوحدة', 'المدة', 'اللغة'];
const PERIOD_NAME = /^(السنة \d+|ما بعد السنة \d+)$/;
const PERIOD_HEADER = /^(السنة \d+|ما بعد السنة \d+):\s*(\d+)\s*وحدة\s*·\s*(.+)$/;
const UNIT_END = 'فتح الرابط';
type Section = 'badges' | 'units';
interface State { section: Section | null; period: ParsedLearningPeriod | null; out: ParsedLearningPlan }

/**
 * Reads the learning plan: the hour-based badges with the rule that awards them, then the learning periods in the order of the file
 * («السنة 1», «السنة 2», «ما بعد السنة 2»…), each with its units (priority, name, provider, duration, language).
 */
export function parseLearningPlan(all: readonly string[]): ParsedLearningPlan {
  const start = all.indexOf('خطة التعلم');
  const end = all.indexOf('المطلوب');
  const lines = all.slice(start >= 0 ? start + 1 : 0, end >= 0 ? end : all.length);
  const state: State = { section: null, period: null, out: { hoursDone: 0, badges: [], rule: '', periods: [], ignored: [] } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line === 'الأوسمة') state.section = 'badges';
    else if (line === 'وحدات التعلم') state.section = 'units';
    else i += state.section === 'badges' ? badgeLine(state.out, lines, i) : state.section === 'units' ? unitLine(state, lines, i) : 0;
  }
  return state.out;
}

function badgeLine(out: ParsedLearningPlan, lines: readonly string[], i: number): number {
  const line = lines[i] as string;
  const next = lineAt(lines, i + 1);
  if (/^\d+$/.test(line) && next === 'ساعات منجزة') {
    out.hoursDone = Number(line);
    return 1;
  }
  if (/^الوسام التالي/.test(line)) return 0;
  if (/^وسام/.test(line) && /^\d+ ساعة$/.test(lineAt(lines, i + 2))) {
    out.badges.push({ name: line, condition: next, hours: parseInt(lineAt(lines, i + 2), 10) });
    return 2;
  }
  if (/^ويبلغ/.test(line)) out.rule = line;
  else out.ignored.push(line);
  return 0;
}

function unitLine(state: State, lines: readonly string[], i: number): number {
  const line = lines[i] as string;
  if (PERIOD_NAME.test(line)) {
    periodOf(state, line);
    return 0;
  }
  if (COLUMN_HEADINGS.includes(line)) return 0;
  const header = PERIOD_HEADER.exec(line);
  if (header) {
    periodOf(state, header[1] as string).header = { count: Number(header[2]), text: header[3] as string, minutes: durationMinutes(header[3] as string) };
    return 0;
  }
  if (PRIORITIES.includes(line) && lineAt(lines, i + 5) === UNIT_END) return addUnit(state, lines, i);
  state.out.ignored.push(line);
  return 0;
}

function addUnit(state: State, lines: readonly string[], i: number): number {
  const period = state.period ?? periodOf(state, state.out.periods[0]?.name ?? 'السنة 1');
  const duration = lineAt(lines, i + 3);
  period.units.push({ priority: lines[i] as string, title: lineAt(lines, i + 1), provider: lineAt(lines, i + 2), duration, minutes: durationMinutes(duration), language: lineAt(lines, i + 4) });
  return 5;
}

/** The period of that name (made when the file mentions it first); it becomes the current one. */
function periodOf(state: State, name: string): ParsedLearningPeriod {
  let period = state.out.periods.find((p) => p.name === name);
  if (!period) {
    period = { name, header: null, units: [] };
    state.out.periods.push(period);
  }
  state.period = period;
  return period;
}
