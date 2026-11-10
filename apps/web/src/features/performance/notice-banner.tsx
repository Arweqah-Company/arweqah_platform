import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatLongDate } from '@/shared/lib/format-date';
import { Alert, Button } from '@/shared/ui';
import { useEvaluationNotices } from './api';

/** «May 3 to May 9», one day, or nothing when the cycle page has no date for the stage. */
function useDue() {
  const { t, i18n } = useTranslation('performance');
  return (due: { from: string; to: string | null } | null): string => {
    if (!due) return '';
    const from = formatLongDate(due.from, i18n.language);
    return ` (${due.to && due.to !== due.from ? t('notice.range', { from, to: formatLongDate(due.to, i18n.language) }) : t('notice.day', { date: from })})`;
  };
}

/** One bar for each evaluation task the person has now: the cycle is open, the deadline of the stage, and a button to the screen they work from. */
export function EvaluationNoticeBanner() {
  const { t } = useTranslation('performance');
  const due = useDue();
  const items = useEvaluationNotices().data?.items ?? [];
  if (!items.length) return null;
  return (
    <section aria-label={t('notice.label')} className="flex flex-col gap-2">
      {items.map((n) => (
        <Alert key={n.kind} tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span><b>{t('notice.open')}</b> {t(`notice.${n.kind}`)}{due(n.due)}</span>
            <Button asChild size="sm"><Link to={n.path}>{t(`notice.go.${n.kind}`)}</Link></Button>
          </div>
        </Alert>
      ))}
    </section>
  );
}
