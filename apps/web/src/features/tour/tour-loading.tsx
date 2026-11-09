import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** How long a step may take to open before the screen says so (a quick step shows no flicker). */
const SHOW_AFTER_MS = 350;

/**
 * Between two steps, while the next page opens and its element is awaited, the dimmed screen says what is happening instead of standing still
 * (a page that takes a moment to load looked like a frozen tour).
 */
export function TourLoading() {
  const { t } = useTranslation('tour');
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-[var(--tour-overlay)]" role="status">
      <p className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-fg shadow-xl shadow-ink/20">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('opening')}
      </p>
    </div>
  );
}
