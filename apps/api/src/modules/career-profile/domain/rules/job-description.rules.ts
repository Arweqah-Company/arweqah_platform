import { PAGE_NOISE } from './title-file-lines.rules';

export interface ParsedJobDescription {
  summary: string;
  kpis: { text: string; governing: boolean }[];
  groups: { title: string; tasks: string[] }[];
  ignored: string[];
}

type Section = 'summary' | 'kpis' | 'groups';
type Group = ParsedJobDescription['groups'][number];

const HEADINGS: Record<Section, readonly string[]> = {
  summary: ['ملخص الوظيفة', 'نبذة عن الوظيفة'],
  kpis: ['مؤشرات الأداء الوظيفي', 'مؤشرات الأداء'],
  groups: ['المسؤوليات', 'المهام والمسؤوليات'],
};
/** The headings of the other parts of the file: the job description ends where one of them starts. */
const OTHER_PARTS: readonly string[] = ['التطوير المهني', 'السلم الوظيفي', 'خطة التعلم', 'المطلوب', 'تقييم الأداء', 'الجدارات الفنية'];
const GOVERNING = /\s*\(المؤشر الحاكم\)/;

const withoutFinalDot = (line: string): string => line.replace(/\.$/, '');

/**
 * Reads the job description: a summary, the indicators (one marked «المؤشر الحاكم»), and the responsibilities, each a line without a final
 * full stop followed by its tasks, which end with one.
 */
export function parseJobDescription(lines: readonly string[]): ParsedJobDescription {
  const out: ParsedJobDescription = { summary: '', kpis: [], groups: [], ignored: [] };
  let section: Section | null = null;
  let group: Group | null = null;
  for (const line of lines) {
    if (PAGE_NOISE.includes(line)) out.ignored.push(line);
    else if (OTHER_PARTS.includes(line)) break;
    else {
      const heading = headingOf(line);
      if (heading) [section, group] = [heading, null];
      else group = addLine(out, section, line, group);
    }
  }
  return out;
}

function headingOf(line: string): Section | null {
  const found = (Object.keys(HEADINGS) as Section[]).find((key) => HEADINGS[key].includes(line));
  return found ?? null;
}

function addLine(out: ParsedJobDescription, section: Section | null, line: string, group: Group | null): Group | null {
  if (section === 'summary') out.summary += (out.summary ? ' ' : '') + line;
  else if (section === 'kpis') out.kpis.push({ text: withoutFinalDot(line.replace(GOVERNING, '')), governing: GOVERNING.test(line) });
  else if (section === 'groups') return addGroupLine(out, line, group);
  else out.ignored.push(line);
  return group;
}

function addGroupLine(out: ParsedJobDescription, line: string, group: Group | null): Group | null {
  if (!/[.؟]$/.test(line)) {
    const created = { title: line, tasks: [] };
    out.groups.push(created);
    return created;
  }
  if (group) group.tasks.push(withoutFinalDot(line));
  else out.ignored.push(line);
  return group;
}
