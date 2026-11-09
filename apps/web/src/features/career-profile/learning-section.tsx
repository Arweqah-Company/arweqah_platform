import type { CareerContent } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Tabs } from '@/shared/ui';
import { useMyProgress } from './api';
import { LearningUnits } from './learning-units';
import { MyRequests } from './my-requests';
import { Part } from './career-parts';


/** The badges the hours earn, and how they are awarded. */
function Badges({ learning, preview }: { learning: CareerContent['learning']; preview: boolean }) {
  const { t } = useTranslation('career-profile');
  const progress = useMyProgress(!preview).data;
  const reached = new Set(progress?.badges.filter((b) => b.reached).map((b) => b.name));
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {learning.badges.map((b) => (
          <div key={b.name} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <b className="text-fg">{b.name}</b>
            <p className="text-sm text-muted">{b.condition}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{t('learning.hours', { count: b.hours })}</Badge>
              {progress && <Badge tone={reached.has(b.name) ? 'success' : 'neutral'}>{t(reached.has(b.name) ? 'learning.reached' : 'learning.notYet')}</Badge>}
            </div>
          </div>
        ))}
      </div>
      {learning.rule && <p className="mt-2 text-sm text-muted">{learning.rule}</p>}
    </>
  );
}

const SUB_TABS = ['units', 'badges', 'requests'] as const;
type SubTab = (typeof SUB_TABS)[number];

/** The body of the sub-tab chosen: the units of a period, the medals, or my requests (never in a preview: nobody's requests). */
function SubPanel({ sub, content, preview }: { sub: SubTab; content: CareerContent; preview: boolean }) {
  const { t } = useTranslation('career-profile');
  const { periods } = content.learning;
  const [name, setName] = useState(periods[0]?.name ?? '');
  const current = periods.find((p) => p.name === name) ?? periods[0];
  if (sub === 'requests') return preview ? null : <MyRequests />;
  if (sub === 'badges') return <Part title={t('learning.badges')}><Badges learning={content.learning} preview={preview} /></Part>;
  return (
    <>
      <Tabs tabs={periods.map((p) => ({ id: p.name, label: `${p.name} (${p.units.length})` }))} value={current?.name ?? ''} label={t('learning.periods')} onChange={setName} />
      <LearningUnits key={current?.name} period={current} preview={preview} />
    </>
  );
}

/** Section 4: three sub-tabs. «Learning units»: the periods as tabs, each a list. «Badges»: what the hours earn. «My requests»: the learning I asked to be paid for. */
export function LearningSection({ content, preview = false }: { content: CareerContent; preview?: boolean }) {
  const { t } = useTranslation('career-profile');
  const [sub, setSub] = useState<SubTab>('units');
  const shown = SUB_TABS.filter((id) => id !== 'requests' || !preview);
  return (
    <div className="flex flex-col gap-4">
      <Tabs tabs={shown.map((id) => ({ id, label: t(`learning.sub.${id}`) }))} value={sub} label={t('learning.subLabel')} onChange={setSub} />
      <div role="tabpanel" className="flex flex-col gap-3"><SubPanel sub={sub} content={content} preview={preview} /></div>
    </div>
  );
}
