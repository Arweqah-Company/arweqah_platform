import type { AiTitleFile } from '../title-file-ai.rules';
import type { TitleFileParts } from '../title-file.rules';

/** What a faithful AI would answer for the sample: the fixed reader's findings written back as the AI's fields (the same facts in the AI's shape). */
export function aiAnswerFor(parts: TitleFileParts): AiTitleFile {
  const { job, dev, learning, required } = parts;
  return {
    summary: job.summary,
    indicators: job.kpis,
    responsibilities: job.groups,
    ladder: dev.ladder.map((l) => ({ ...l, level: l.level as AiTitleFile['ladder'][number]['level'] })),
    transitionRule: dev.condition,
    pathUnit: dev.unit,
    pathTitle: dev.title,
    steps: dev.steps,
    output: dev.output,
    certificates: dev.certificates,
    competencyColumns: dev.columns,
    competencies: dev.competencies.map((c) => ({ name: c.name, values: c.values as AiTitleFile['competencies'][number]['values'] })),
    badges: learning.badges,
    badgesRule: learning.rule,
    learningPeriods: learning.periods.map((p) => ({
      name: p.name,
      statedUnits: p.header?.count ?? 0,
      statedDuration: p.header?.text ?? '',
      units: p.units.map((u) => ({ priority: u.priority as AiTitleFile['learningPeriods'][number]['units'][number]['priority'], title: u.title, provider: u.provider, duration: u.duration, language: u.language })),
    })),
    required: required.items.map((r) => ({ when: r.when, lines: r.lines })),
    acknowledgement: required.acknowledgement,
  };
}
