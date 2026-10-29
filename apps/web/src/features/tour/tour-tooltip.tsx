import { X } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TooltipRenderProps } from 'react-joyride';
import { Badge } from '@/shared/ui';
import { Button } from '@/shared/ui/button';
import { useTourPlayer } from './tour-context';

/** The tour bubble: the same surface, buttons and badge as the dialogs, so it follows both themes and both directions. */
/** Joyride labels its last step's button «close»; the labels and the actions are the tour's own, so only its `tooltipProps` are used. */
export function TourTooltip({ step, tooltipProps }: TooltipRenderProps) {
  const { t } = useTranslation('tour');
  const player = useTourPlayer();
  const titleId = useId();
  if (!player) return null;
  const last = player.index === player.total - 1;
  return (
    <div {...tooltipProps} aria-labelledby={titleId} className="w-[min(22rem,calc(100vw-2rem))] animate-fade-in rounded-3xl border border-neutral-200 bg-white p-5 text-fg shadow-2xl shadow-ink/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id={titleId} className="min-w-0 font-heading text-lg font-bold">{step.title}</h2>
        <button type="button" onClick={player.skip} aria-label={t('close')} className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-neutral-200 text-fg transition-colors hover:bg-neutral-50">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="max-h-[50vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted">{step.content}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Badge>{t('progress', { current: player.index + 1, total: player.total })}</Badge>
        <div className="flex items-center gap-2">
          {!last && <Button onClick={player.skip} variant="ghost" size="sm">{t('skip')}</Button>}
          {player.index > 0 && <Button onClick={player.back} variant="secondary" size="sm">{t('back')}</Button>}
          <Button onClick={player.next} size="sm">{last ? t('done') : t('next')}</Button>
        </div>
      </div>
    </div>
  );
}
