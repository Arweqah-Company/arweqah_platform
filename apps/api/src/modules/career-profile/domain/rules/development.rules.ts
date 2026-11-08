import { afterColon, lineAt } from './title-file-lines.rules';

export interface ParsedDevelopment {
  ladder: { level: string; title: string; current: boolean }[];
  condition: string;
  unit: string;
  title: string;
  steps: { n: number; label: string; title: string; meta: string }[];
  output: string;
  certificates: string;
  columns: string[];
  competencies: { name: string; values: string[] }[];
  ignored: string[];
}
type Section = 'ladder' | 'condition' | 'steps' | 'competencies';

const LEVEL = /^L[1-9]$/;
const COMPETENCY_VALUES: readonly string[] = ['أساسي', 'خبير', 'غير مطلوبة', '—'];
const MARKS: Readonly<Record<string, Section>> = { 'السلم الوظيفي': 'ladder', 'شرط الانتقال للمستوى التالي': 'condition', 'الجدارات الفنية': 'competencies' };
/** The parts that follow the development in the file. */
const LATER_PARTS: readonly string[] = ['خطة التعلم', 'المطلوب', 'تقييم الأداء'];

/** What each handler returns: how many lines after the current one it used. */
type Used = number;
interface State { section: Section | null; out: ParsedDevelopment }

/**
 * Reads the career development: the ladder (L1 to L9, the current title marked), the condition to move up, the unit and title of the level
 * path and its steps, the documented output and the certificates of the level, and the technical competencies by level.
 */
export function parseDevelopment(all: readonly string[]): ParsedDevelopment {
  const start = all.indexOf('التطوير المهني');
  const lines = start >= 0 ? all.slice(start + 1) : all;
  const state: State = { section: null, out: { ladder: [], condition: '', unit: '', title: '', steps: [], output: '', certificates: '', columns: [], competencies: [], ignored: [] } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (LATER_PARTS.includes(line)) break;
    const mark = MARKS[line];
    if (mark) state.section = mark;
    else i += consume(state, lines, i);
  }
  return state.out;
}

function consume(state: State, lines: readonly string[], i: number): Used {
  switch (state.section) {
    case 'ladder': return ladderLine(state.out, lines, i);
    case 'condition': return conditionLine(state, lines[i] as string);
    case 'steps': return stepLine(state.out, lines, i);
    case 'competencies': return competencyLine(state.out, lines, i);
    default: return 0;
  }
}

function ladderLine(out: ParsedDevelopment, lines: readonly string[], i: number): Used {
  const line = lines[i] as string;
  const title = lineAt(lines, i + 1);
  if (!LEVEL.test(line) || !title) {
    out.ignored.push(line);
    return 0;
  }
  const current = lineAt(lines, i + 2) === 'المسمى الحالي';
  out.ladder.push({ level: line, title, current });
  return current ? 2 : 1;
}

function conditionLine(state: State, line: string): Used {
  const out = state.out;
  if (!out.condition) out.condition = line;
  else if (!out.unit && line.includes('·')) out.unit = line;
  else if (!out.title) {
    out.title = line;
    state.section = 'steps';
  }
  return 0;
}

function stepLine(out: ParsedDevelopment, lines: readonly string[], i: number): Used {
  const line = lines[i] as string;
  const label = lineAt(lines, i + 1);
  if (/^[1-9]$/.test(line) && label) {
    out.steps.push({ n: Number(line), label, title: lineAt(lines, i + 2), meta: lineAt(lines, i + 3) });
    return 3;
  }
  if (/^مخرجه/.test(line)) out.output = afterColon(line);
  else if (/^شهاداته/.test(line)) out.certificates = afterColon(line);
  else out.ignored.push(line);
  return 0;
}

function competencyLine(out: ParsedDevelopment, lines: readonly string[], i: number): Used {
  const line = lines[i] as string;
  if (line === 'الجدارة') return readColumns(out, lines, i);
  const width = out.columns.length;
  const values = lines.slice(i + 1, i + 1 + width);
  if (width > 0 && !COMPETENCY_VALUES.includes(line) && values.length === width && values.every((v) => COMPETENCY_VALUES.includes(v))) {
    out.competencies.push({ name: line, values });
    return width;
  }
  out.ignored.push(line);
  return 0;
}

function readColumns(out: ParsedDevelopment, lines: readonly string[], i: number): Used {
  let j = i + 1;
  while (/^L\d\s/.test(lineAt(lines, j))) out.columns.push(lines[j++] as string);
  return j - i - 1;
}
