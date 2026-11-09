import { careerContentSchema, orderedLadder, type CareerContent,  type TitleFileCountsDto, type TitleFileProblem } from '@arweqah-platform/shared';
import { parseDevelopment, type ParsedDevelopment } from './development.rules';
import { parseJobDescription, type ParsedJobDescription } from './job-description.rules';
import { parseLearningPlan, type ParsedLearningPlan } from './learning-plan.rules';
import { parseRequiredActions, type ParsedRequiredActions } from './required-actions.rules';
import { fileLines } from './title-file-lines.rules';

type CareerLearningPriority = CareerContent['learning']['periods'][number]['units'][number]['priority'];

export interface TitleFileReading {
  /** The career content the file says (what a save writes), the learning plan included (its units get their ids when saved). */
  content: CareerContent;
  learning: ParsedLearningPlan;
  counts: TitleFileCountsDto;
  problems: TitleFileProblem[];
  codeInFile: string | null;
  ignored: string[];
}

const TITLE_CODE_LINE = /^[A-Z]{3}\./;

/** The four parts of a title file, however they were found: by the fixed reader or placed by the AI (§2.9). */
export interface TitleFileParts {
  job: ParsedJobDescription;
  dev: ParsedDevelopment;
  learning: ParsedLearningPlan;
  required: ParsedRequiredActions;
}

/** Reads a whole title file: the four parts, what they hold, and what is still wrong with them (nothing is saved here). */
export function readTitleFile(text: string, titleCode: string | null): TitleFileReading {
  return readingOf(partsOf(text), titleCode);
}

/** The four parts of a pasted file, found by their headings. */
export function partsOf(text: string): TitleFileParts {
  const lines = fileLines(text);
  return { job: parseJobDescription(lines), dev: parseDevelopment(lines), learning: parseLearningPlan(lines), required: parseRequiredActions(lines) };
}

/** What the four parts say as career content, their counts, and what is still wrong with them: one set of checks for both ways of reading. */
export function readingOf({ job, dev, learning, required }: TitleFileParts, titleCode: string | null): TitleFileReading {
  const content = buildContent(job, dev, required, learning);
  const codeInFile = codeInRequired(content);
  return {
    content,
    learning,
    counts: countsOf(job, dev, learning, required),
    problems: problemsOf(content, learningTotalMismatch(learning), codeInFile, titleCode),
    codeInFile,
    ignored: [...job.ignored, ...dev.ignored, ...learning.ignored, ...required.ignored],
  };
}

/** What would stop a content (placed by the AI and reviewed by a person) from being saved: the same checks, from the content alone. */
export function contentProblems(content: CareerContent, titleCode: string | null): TitleFileProblem[] {
  return problemsOf(content, false, codeInRequired(content), titleCode);
}

function codeInRequired(content: CareerContent): string | null {
  return content.required.flatMap((i) => i.lines).find((l) => TITLE_CODE_LINE.test(l)) ?? null;
}

function buildContent(job: ParsedJobDescription, dev: ParsedDevelopment, required: ParsedRequiredActions, learning: ParsedLearningPlan): CareerContent {
  return {
    summary: job.summary,
    kpis: job.kpis,
    responsibilities: job.groups,
    ladder: orderedLadder(dev.ladder.map((l) => ({ level: l.level as CareerContent['ladder'][number]['level'], title: l.title, current: l.current }))),
    transitionRule: dev.condition,
    pathUnit: dev.unit,
    pathTitle: dev.title,
    steps: dev.steps,
    output: dev.output,
    certificates: dev.certificates,
    competencyColumns: dev.columns,
    competencies: dev.competencies,
    required: required.items,
    ackText: required.acknowledgement,
    learning: learningOf(learning),
  };
}

function learningOf(plan: ParsedLearningPlan): CareerContent['learning'] {
  return {
    badges: plan.badges,
    rule: plan.rule,
    periods: plan.periods.map((p) => ({
      name: p.name,
      units: p.units.map((u) => ({ priority: u.priority as CareerLearningPriority, title: u.title, provider: u.provider, duration: u.duration, minutes: u.minutes, language: u.language, link: '' })),
    })),
  };
}

function countsOf(job: ParsedJobDescription, dev: ParsedDevelopment, learning: ParsedLearningPlan, required: ParsedRequiredActions): TitleFileCountsDto {
  const units = learning.periods.flatMap((p) => p.units);
  return {
    indicators: job.kpis.length,
    responsibilities: job.groups.length,
    tasks: job.groups.reduce((sum, g) => sum + g.tasks.length, 0),
    ladderLevels: dev.ladder.length,
    pathSteps: dev.steps.length,
    competencies: dev.competencies.length,
    badges: learning.badges.length,
    learningPeriods: learning.periods.length,
    learningUnits: units.length,
    learningMinutes: units.reduce((sum, u) => sum + u.minutes, 0),
    requiredItems: required.items.length,
  };
}

function problemsOf(c: CareerContent, totalMismatch: boolean, codeInFile: string | null, titleCode: string | null): TitleFileProblem[] {
  const checks: [boolean, TitleFileProblem][] = [
    [!c.summary, 'summary_missing'],
    [c.kpis.length === 0, 'indicators_missing'],
    [c.responsibilities.length === 0, 'responsibilities_missing'],
    [!c.ladder.some((l) => l.current), 'current_title_unmarked'],
    [c.steps.length === 0, 'path_steps_missing'],
    [!c.transitionRule, 'transition_rule_missing'],
    [c.competencies.length === 0, 'competencies_missing'],
    [!c.learning.periods.some((p) => p.units.length > 0), 'learning_missing'],
    [totalMismatch, 'learning_total_mismatch'],
    [c.learning.badges.length === 0, 'badges_missing'],
    [c.required.length === 0, 'required_missing'],
    [!c.ackText, 'acknowledgement_missing'],
    [!!codeInFile && !!titleCode && codeInFile !== titleCode, 'code_mismatch'],
    [!careerContentSchema.safeParse(c).success, 'content_invalid'],
  ];
  return checks.filter(([wrong]) => wrong).map(([, problem]) => problem);
}

/** The first period that states its own total must agree with its units (how many, and how long). */
function learningTotalMismatch(learning: ParsedLearningPlan): boolean {
  const stated = learning.periods.find((p) => p.header);
  if (!stated?.header) return false;
  const minutes = stated.units.reduce((sum, u) => sum + u.minutes, 0);
  return stated.units.length !== stated.header.count || minutes !== stated.header.minutes;
}
