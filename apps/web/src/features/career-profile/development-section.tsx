import type { CareerContent, DevelopmentStageDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Tabs } from '@/shared/ui';
import { useMyProgress } from './api';
import { LadderGraph } from './ladder-graph';

/** The steps of the level path: label, what to do, and how it is evidenced. */
function PathSteps({ steps }: { steps: CareerContent['steps'] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {steps.map((s) => (
        <div key={s.n} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-3">
          <span className="text-sm text-muted">{s.n}. {s.label}</span>
          <span className="font-medium text-fg">{s.title}</span>
          <span className="text-sm text-muted">{s.meta}</span>
        </div>
      ))}
    </div>
  );
}

/** What the manager recorded for the competency and whether it is met; a competency the title does not ask for shows nothing. */
function MyLevelCell({ status }: { status?: { mine: string | null; met: boolean } }) {
  const { t } = useTranslation('career-profile');
  if (!status) return <td className="px-3 py-2 text-center text-muted">—</td>;
  return <td className="px-3 py-2 text-center"><span className="inline-flex flex-wrap items-center justify-center gap-2">{status.mine && <span className="text-fg">{status.mine}</span>}{status.met ? <Badge tone="success">{t('mine.met')}</Badge> : !status.mine && <span className="text-muted">{t('mine.none')}</span>}</span></td>;
}

/** The technical competencies by level (a table on a wide screen, scrolling sideways on a phone). */
function Competencies({ content, preview }: { content: CareerContent; preview: boolean }) {
  const { t } = useTranslation('career-profile');
  const mine = new Map(useMyProgress(!preview).data?.competencies.map((c) => [c.name, c]));
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="bg-neutral-50 text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-medium">{t('development.competency')}</th>
            {content.competencyColumns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 text-center font-medium">{c}</th>
            ))}
            {!preview && <th scope="col" className="px-3 py-2 text-center font-medium">{t('mine.level')}</th>}
          </tr>
        </thead>
        <tbody>
          {content.competencies.map((row) => (
            <tr key={row.name} className="border-t border-neutral-200">
              <th scope="row" className="px-3 py-2 text-start font-normal text-fg">{row.name}</th>
              {row.values.map((v, i) => (
                <td key={content.competencyColumns[i] ?? i} className="px-3 py-2 text-center text-fg">{v}</td>
              ))}
              {!preview && <MyLevelCell status={mine.get(row.name)} />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SUB_TABS = ['ladder', 'path', 'competencies'] as const;
type SubTab = (typeof SUB_TABS)[number];

/** The development stage of the title (from its grade and track), the hours a year and the budget cap of one person. */
function StageTiles({ stage }: { stage: DevelopmentStageDto }) {
  const { t } = useTranslation('career-profile');
  const tiles = [[t('development.stageLabel'), t(`stage.${stage.code}`)], [t('development.hoursLabel'), t('development.hours', { count: stage.hoursPerYear })], [t('development.budgetLabel'), t('development.budget', { amount: stage.budgetCap.toLocaleString('en') })]];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
          <span className="text-sm text-muted">{label}</span>
          <b className="block text-lg text-fg">{value}</b>
        </div>
      ))}
    </div>
  );
}

function PathPanel({ content }: { content: CareerContent }) {
  const { t } = useTranslation('career-profile');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-bold text-fg">{content.pathTitle}{content.pathUnit ? ` (${content.pathUnit})` : ''}</h3>
      <PathSteps steps={content.steps} />
      {content.output && <p className="text-fg"><b>{t('development.output')}:</b> {content.output}</p>}
      {content.certificates && <p className="text-fg"><b>{t('development.certificates')}:</b> {content.certificates}</p>}
      <p className="text-sm text-muted">{t('development.pathNote')}</p>
    </div>
  );
}

/** Section 3: the stage tiles, then three sub-tabs: the ladder with the condition to move up, the level path, and the technical competencies. */
export function DevelopmentSection({ content, stage, preview = false }: { content: CareerContent; stage?: DevelopmentStageDto | null; preview?: boolean }) {
  const { t } = useTranslation('career-profile');
  const [sub, setSub] = useState<SubTab>('ladder');
  return (
    <div className="flex flex-col gap-4">
      {stage && <StageTiles stage={stage} />}
      <Tabs tabs={SUB_TABS.map((id) => ({ id, label: t(`development.sub.${id}`) }))} value={sub} label={t('development.subLabel')} onChange={setSub} />
      <div role="tabpanel" className="flex flex-col gap-3">
        {sub === 'ladder' && <><LadderGraph ladder={content.ladder} preview={preview} /><Alert tone="info"><b>{t('development.condition')}:</b> {content.transitionRule}</Alert></>}
        {sub === 'path' && <PathPanel content={content} />}
        {sub === 'competencies' && <><Competencies content={content} preview={preview} /><p className="text-sm text-muted">{t('development.competenciesNote')}</p></>}
      </div>
    </div>
  );
}
