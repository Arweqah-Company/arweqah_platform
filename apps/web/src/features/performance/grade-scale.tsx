import type { GradeBand } from '@arweqah-platform/shared';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui';

/** The tint of a level by its place from the lowest: red, orange (yellow tint), blue between, green tint, and the top one solid green. */
function levelClass(i: number, n: number): string {
  if (i === n - 1) return 'bg-green-400 text-ink border-b-green-800';
  if (i === 0) return 'bg-danger-50 border-b-danger-700';
  if (i === 1) return 'bg-yellow-50 border-b-yellow-300';
  return i === n - 2 ? 'bg-green-50 border-b-green-400' : 'bg-petrol-50 border-b-link';
}

/** Each step stands higher than the one before it (fixed classes; a long text grows its own step and is never cut). */
const HEIGHTS = ['min-h-36', 'min-h-44', 'min-h-52', 'min-h-60', 'min-h-72', 'min-h-80', 'min-h-80', 'min-h-80', 'min-h-80', 'min-h-80'];
const DEFAULT_SCORE = 87;

/** The bands from the lowest, with where each starts; the score belongs to the highest band that starts at or below it. */
const ascending = (bands: GradeBand[]) => [...bands].map((b) => ({ ...b, start: b.from ?? 0 })).sort((a, b) => a.start - b.start);

/**
 * The grade scale as the concept draws it: the score with its level and the cap, a slider to try a score, steps rising from the lowest on wide screens (the lowest at the
 * start edge, so at the right in Arabic) and a ladder with the highest on top on a phone; the level of the score is marked «here». Under it a card per level.
 */
export function GradeScale({ bands, cap, score }: { bands: GradeBand[]; cap: number; /** A real score (the employee's result); without it the slider is offered. */ score?: number }) {
  const { t } = useTranslation('performance');
  const [tried, setTried] = useState(Math.min(DEFAULT_SCORE, cap));
  const value = score ?? Math.min(tried, cap);
  const levels = ascending(bands);
  const current = [...levels].reverse().find((b) => value >= b.start) ?? levels[0];
  const pin = t(score === undefined ? 'evaluation.here' : 'evaluation.yours');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-bold text-fg">{t('evaluation.scale', { cap })}</h3>
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted">{t('evaluation.finalScore')}</span><b className="text-3xl tabular-nums text-fg" dir="ltr">{value}</b><Badge tone="info">{current?.name}</Badge><span className="ms-auto text-sm text-muted">{t('evaluation.capLine', { cap })}</span></div>
        {score === undefined && <label className="flex flex-col gap-1 text-sm font-medium text-fg">{t('evaluation.tryScore')}<input type="range" min={0} max={cap} step={0.1} value={tried} onChange={(e) => setTried(Number(e.target.value))} className="w-full accent-petrol-800" aria-label={t('evaluation.tryScoreLabel')} /></label>}
        <ol className="hidden items-end gap-2 pt-6 lg:flex" aria-label={t('evaluation.scaleLabel')}>
          {levels.map((b, i) => (
            <li key={b.name} className={cn('relative flex min-w-0 flex-1 flex-col gap-1 rounded-t-2xl rounded-b-md border border-b-4 border-neutral-200 p-3 text-sm', levelClass(i, levels.length), HEIGHTS[Math.min(i, HEIGHTS.length - 1)], b === current && 'outline outline-[3px] outline-offset-2 outline-link')}>
              {b === current && <span className="absolute inset-x-0 -top-6 mx-auto w-max rounded-full bg-link px-2.5 text-xs font-bold text-on-primary">{pin}</span>}
              <span dir="ltr" className="text-xs font-bold tabular-nums">{b.range}</span><b className="text-base">{b.name}</b><span>{b.description}</span>
            </li>
          ))}
        </ol>
        <ul className="flex flex-col gap-2 lg:hidden" aria-label={t('evaluation.ladderLabel')}>
          {[...levels].reverse().map((b) => {
            const i = levels.indexOf(b);
            return (
              <li key={b.name} className={cn('flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3', b === current && 'border-2 border-link bg-petrol-50')}>
                <span dir="ltr" className={cn('grid min-h-10 w-28 shrink-0 place-items-center rounded-xl border-b-4 px-2 text-center text-sm font-bold tabular-nums', levelClass(i, levels.length))}>{b.range}</span>
                <span className="flex min-w-0 flex-1 flex-col"><b className="text-fg">{b.name}</b><span className="text-sm text-muted">{b.description}</span></span>
                {b === current && <Badge tone="info"><Check className="size-3.5" aria-hidden />{pin}</Badge>}
              </li>
            );
          })}
        </ul>
        <p className="hidden text-sm text-muted lg:block">{t('evaluation.scaleDirection', { cap })}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bands.map((b, i) => (
          <div key={b.name} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <b className="text-fg">{b.name}</b>
            <span><Badge tone={i < bands.length - 2 ? 'success' : i === bands.length - 2 ? 'warning' : 'danger'}>{t('evaluation.final')} {b.range}</Badge></span>
            <span className="text-sm text-muted">{b.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
