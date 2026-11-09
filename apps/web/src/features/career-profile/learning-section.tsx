import type { CareerContent } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs } from '@/shared/ui';
import { LearningUnits } from './learning-units';
import { MyRequests } from './my-requests';
import { LearningBadges } from './learning-badges';
import { useTabCoverage } from './reading-coverage';


const SUB_TABS = ['units', 'badges', 'requests'] as const;
type SubTab = (typeof SUB_TABS)[number];

/** The units of the plan: one tab per period (every one must be opened while reading before acknowledging). */
function Periods({ content, preview }: { content: CareerContent; preview: boolean }) {
  const { t } = useTranslation('career-profile');
  const { periods } = content.learning;
  const [name, setName] = useState(periods[0]?.name ?? '');
  const current = periods.find((p) => p.name === name) ?? periods[0];
  useTabCoverage('learning', 'learning.periods', periods.map((p) => ({ id: p.name, label: p.name })), current?.name ?? '');
  return (
    <>
      <Tabs tabs={periods.map((p) => ({ id: p.name, label: `${p.name} (${p.units.length})` }))} value={current?.name ?? ''} label={t('learning.periods')} onChange={setName} />
      <LearningUnits key={current?.name} period={current} preview={preview} />
    </>
  );
}

/** The body of the sub-tab chosen: the units of a period, the medals, or my requests (never in a preview: nobody's requests). */
function SubPanel({ sub, content, preview }: { sub: SubTab; content: CareerContent; preview: boolean }) {
  if (sub === 'requests') return preview ? null : <MyRequests />;
  if (sub === 'badges') return <LearningBadges learning={content.learning} preview={preview} />;
  return <Periods content={content} preview={preview} />;
}

/** Section 4: three sub-tabs. «Learning units»: the periods as tabs, each a list. «Badges»: what the hours earn. «My requests»: the learning I asked to be paid for. */
export function LearningSection({ content, preview = false }: { content: CareerContent; preview?: boolean }) {
  const { t } = useTranslation('career-profile');
  const [sub, setSub] = useState<SubTab>('units');
  const shown = SUB_TABS.filter((id) => id !== 'requests' || !preview);
  useTabCoverage('learning', 'learning.sub', shown.map((id) => ({ id, label: t(`learning.sub.${id}`) })), sub);
  return (
    <div className="flex flex-col gap-4">
      <Tabs tabs={shown.map((id) => ({ id, label: t(`learning.sub.${id}`) }))} value={sub} label={t('learning.subLabel')} onChange={setSub} />
      <div role="tabpanel" className="flex flex-col gap-3"><SubPanel sub={sub} content={content} preview={preview} /></div>
    </div>
  );
}
