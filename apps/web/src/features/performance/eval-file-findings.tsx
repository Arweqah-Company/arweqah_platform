import { FISCAL_MONTHS, PERFORMANCE_STAGES, SCALE_LEVELS_MAX, SCALE_LEVELS_MIN, type EvalFileResult, type EvalProblem, type StageResult } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Alert, Badge } from '@/shared/ui';

/** The checks of a stage that the four columns of the table show; any other failed check of the stage is listed under the table. */
const COLUMN_PROBLEMS: EvalProblem[] = ['basic_split', 'criteria_sum', 'no_criteria', 'cap_sum', 'no_behaviours', 'behaviour_question'];

/** The grade scale has its five levels and the fiscal-year card its twelve months, and neither failed a check. */
export function sharedSound(result: EvalFileResult): boolean {
  const scale = !!result.scale && !result.scale.problems.length && result.scale.bands.length >= SCALE_LEVELS_MIN && result.scale.bands.length <= SCALE_LEVELS_MAX;
  const fiscal = !!result.fiscal && !result.fiscal.problems.length && result.fiscal.card.months.length === FISCAL_MONTHS;
  return scale && fiscal;
}

/** The file may be saved: at least one stage, every stage sound, and the scale and the card complete. */
export const isSound = (result: EvalFileResult): boolean => result.stages.length > 0 && result.stages.every((s) => !s.problems.length) && sharedSound(result);

function StageRow({ stage }: { stage: StageResult }) {
  const { t } = useTranslation('performance');
  const x = stage.template;
  const ok = (...codes: EvalProblem[]) => !codes.some((c) => stage.problems.includes(c));
  const cell = (good: boolean, text: string) => <td className="px-2 py-2"><Badge tone={good ? 'success' : 'warning'}>{text}</Badge></td>;
  return (
    <tr className="border-b border-neutral-200 last:border-b-0">
      <th scope="row" className="px-2 py-2 text-start font-normal text-fg">{stage.stage} {stage.name}</th>
      {cell(ok('basic_split'), `${x.resultsWeight}/${x.behaviourWeight}`)}
      {cell(ok('criteria_sum', 'no_criteria'), t('file.criteriaCount', { count: x.criteria.length }))}
      {cell(ok('cap_sum'), `${x.cap}%`)}
      {cell(ok('no_behaviours', 'behaviour_question'), t('file.behavioursCount', { count: x.behaviours.length }))}
      <td className="px-2 py-2"><Badge tone={stage.problems.length ? 'warning' : 'success'}>{t(stage.problems.length ? 'file.reviewStage' : 'file.soundStage')}</Badge></td>
    </tr>
  );
}

/** The table of the stages: a row per stage with the basic split, the criteria, the extra and cap, the behaviours and its state. */
function StageTable({ stages }: { stages: StageResult[] }) {
  const { t } = useTranslation('performance');
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t('file.table.stage')}>
      <table className="w-full min-w-[34rem] text-sm">
        <thead><tr className="border-b border-neutral-200 text-muted">{(['stage', 'basic', 'criteria', 'cap', 'behaviours', 'state'] as const).map((c) => <th key={c} scope="col" className="px-2 py-2 text-start font-medium">{t(`file.table.${c}`)}</th>)}</tr></thead>
        <tbody>{stages.map((s) => <StageRow key={s.stage} stage={s} />)}</tbody>
      </table>
    </div>
  );
}

/** What the stages share (the scale, the card), and the warning when fewer than five stages were found. */
function SharedNotes({ result, count }: { result: EvalFileResult; count: number }) {
  const { t } = useTranslation('performance');
  const counts = { scale: result.scale?.bands.length ?? 0, months: result.fiscal?.card.months.length ?? 0, notes: result.fiscal?.card.notes.length ?? 0 };
  return (
    <>
      <Alert tone={sharedSound(result) ? 'success' : 'warning'}>{t('file.shared', counts)}</Alert>
      {count < PERFORMANCE_STAGES.length && <Alert tone="warning">{t('file.fewStages', { count })}</Alert>}
    </>
  );
}

/** The failed checks that the columns of the table do not show, each once. */
const otherProblems = (result: EvalFileResult): EvalProblem[] => [...new Set([...result.stages.flatMap((s) => s.problems), ...(result.scale?.problems ?? []), ...(result.fiscal?.problems ?? [])])].filter((p) => !COLUMN_PROBLEMS.includes(p));

/** What the file holds, as the concept shows it: a table with a row per stage, what the stages share, and what is missing. */
export function Findings({ result }: { result: EvalFileResult }) {
  const { t } = useTranslation('performance');
  const stages = [...result.stages].sort((a, b) => a.stage - b.stage);
  const others = otherProblems(result);
  if (!stages.length && !result.scale && !result.fiscal) return <Alert tone="warning">{t('file.empty')}</Alert>;
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {stages.length > 0 && <StageTable stages={stages} />}
      <SharedNotes result={result} count={stages.length} />
      {others.length > 0 && <ul className="list-disc ps-5 text-sm text-fg">{others.map((p) => <li key={p}>{t(`file.problems.${p}`)}</li>)}</ul>}
      <p className="text-sm text-muted">{t('file.weightsNote')}</p>
    </div>
  );
}
