import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';

/** A small card offered once after a release added steps to a tour the person already knows: take the new steps, or dismiss. */
export function WhatsNew({ count, onStart, onLater }: { count: number; onStart: () => void; onLater: () => void }) {
  const { t } = useTranslation('tour');
  return (
    <div role="status" className="fixed bottom-4 start-4 z-40 flex w-[min(24rem,calc(100vw-2rem))] animate-fade-in items-start gap-3 rounded-3xl border border-neutral-200 bg-white p-4 text-fg shadow-xl shadow-ink/15">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-petrol-50 text-link"><Sparkles className="size-5" aria-hidden /></span>
      <div className="min-w-0">
        <p className="font-heading font-bold">{t('whatsNew.title')}</p>
        <p className="mt-1 text-sm text-muted">{t('whatsNew.body', { count })}</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onStart}>{t('whatsNew.start')}</Button>
          <Button size="sm" variant="ghost" onClick={onLater}>{t('whatsNew.later')}</Button>
        </div>
      </div>
    </div>
  );
}
