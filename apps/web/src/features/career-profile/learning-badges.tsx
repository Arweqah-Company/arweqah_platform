import type { CareerContent } from '@arweqah-platform/shared';
import { Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import { useMyProgress } from './api';

type Medal = CareerContent['learning']['badges'][number];

/** The hours as the reader counts them: a tenth of an hour at most. */
const hoursOf = (minutes: number): number => Math.round((minutes / 60) * 10) / 10;

/** One medal: its round icon (filled when reached, dashed when not), its name and condition, and how far the hours are from its threshold. */
function MedalCard({ medal, doneMinutes, shown }: { medal: Medal; doneMinutes: number | null; shown: boolean }) {
  const { t } = useTranslation('career-profile');
  const done = doneMinutes === null ? 0 : hoursOf(doneMinutes);
  const reached = doneMinutes !== null && doneMinutes >= medal.hours * 60;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full border-2 text-fg ${reached ? 'border-yellow-300 bg-yellow-50' : 'border-dashed border-neutral-500 bg-white text-muted'}`}>
          <Award className="size-5" aria-hidden />
          {reached && <span className="sr-only">{t('learning.reached')}</span>}
        </span>
        <div className="min-w-0">
          <b className="block text-fg">{medal.name}</b>
          <span className="text-sm text-muted">{medal.condition}</span>
        </div>
      </div>
      {shown && <progress className="h-2.5 w-full accent-petrol-800" value={Math.min(100, Math.round((done / medal.hours) * 100))} max={100} aria-label={medal.name} />}
      <span className="text-sm text-muted">{shown ? t('learning.progressOf', { done, hours: medal.hours }) : t('learning.threshold', { hours: medal.hours })}</span>
    </div>
  );
}

/** The hours done and the next medal, above the medals (never in a preview: nobody's hours). */
function HoursSummary({ minutes, next }: { minutes: number; next: { name: string; hours: number } | null }) {
  const { t } = useTranslation('career-profile');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-3xl font-bold tabular-nums text-fg">{hoursOf(minutes)}</span>
      <span className="text-fg">{t('learning.hoursDone')}</span>
      {next ? <Badge tone="info">{t('learning.nextMedal', { name: next.name, hours: next.hours })}</Badge> : <Badge tone="success">{t('learning.allMedals')}</Badge>}
    </div>
  );
}

/** The medals the hours earn (the learning plan's «Badges» tab): one card each with its progress bar, under the hours done and the next medal, then the rule that awards them. */
export function LearningBadges({ learning, preview }: { learning: CareerContent['learning']; preview: boolean }) {
  const progress = useMyProgress(!preview).data;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      {progress && <HoursSummary minutes={progress.approvedMinutes} next={progress.nextBadge} />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {learning.badges.map((medal) => <MedalCard key={medal.name} medal={medal} doneMinutes={progress?.approvedMinutes ?? null} shown={!preview && !!progress} />)}
      </div>
      {learning.rule && <p className="text-sm text-muted">{learning.rule}</p>}
    </div>
  );
}
