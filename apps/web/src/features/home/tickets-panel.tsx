import type { TicketStatus, TicketSummaryDto, TicketSummaryItemDto } from '@arweqah-platform/shared';
import { formatTicketNumber } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/shared/ui';

function TicketList({ title, empty, items, highlight }: { title: string; empty: string; items: TicketSummaryItemDto[]; highlight?: TicketStatus }) {
  const { t, i18n } = useTranslation('home');
  const ar = i18n.language === 'ar';
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-fg">{title}</h3>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200">
          {items.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="flex min-w-0 flex-col">
                <Link to={`/tickets/${x.id}`} className="break-words text-sm font-medium hover:underline">{x.title}</Link>
                <span className="text-xs text-muted"><span dir="ltr">{formatTicketNumber(x.number)}</span> · {ar ? x.deskNameAr : x.deskNameEn}</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {highlight && x.status === highlight && <Badge tone="warning">{t('tickets.needsConfirm')}</Badge>}
                <span dir="ltr">{x.neededBy}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** My tickets: those I sent that are still open (the ones waiting for my confirmation marked), and those waiting for my reply. */
export function TicketsPanel({ summary }: { summary: TicketSummaryDto | undefined }) {
  const { t } = useTranslation('home');
  if (!summary) return <div role="status" aria-label={t('loading')} className="h-40 animate-pulse rounded-3xl bg-neutral-50" />;
  return (
    <section aria-labelledby="home-my-tickets" className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm shadow-ink/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="home-my-tickets" className="text-lg font-bold">{t('tickets.title')}</h2>
        <Link to="/tickets" className="text-sm text-link hover:underline">{t('tickets.all')}</Link>
      </div>
      <TicketList title={t('tickets.sent')} empty={t('tickets.sentEmpty')} items={summary.sent} highlight="close_requested" />
      <TicketList title={t('tickets.waiting')} empty={t('tickets.waitingEmpty')} items={summary.waiting} />
    </section>
  );
}
