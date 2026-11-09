import { CorePermission, type CareerContent } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { Badge } from '@/shared/ui';
import { useMyProgress, useTickRequired } from './api';
import { Part } from './career-parts';
import { daysUntil } from './deadline';

type Item = CareerContent['required'][number];

/** How far a dated item is: overdue (danger), within 30 days (warning), later (neutral); an item with no date is «while you are in this period». */
function DeadlineBadge({ item, today }: { item: Item; today: Date }) {
  const { t } = useTranslation('career-profile');
  if (!item.deadline) return <Badge>{t('required.whileInPeriod')}</Badge>;
  const days = daysUntil(item.deadline, today);
  if (days < 0) return <Badge tone="danger">{t('required.overdue')}</Badge>;
  return <Badge tone={days <= 30 ? 'warning' : 'neutral'}>{t('required.daysLeft', { count: days })}</Badge>;
}

/** Section 5: the dated actions and the acknowledgement sentence. */
export function RequiredSection({ content, today = new Date(), preview = false }: { content: CareerContent; today?: Date; preview?: boolean }) {
  const { t } = useTranslation('career-profile');
  const done = new Set(useMyProgress(!preview).data?.requiredDone);
  const tick = useTickRequired();
  const canTick = usePermissions().can(CorePermission.CareerRequiredTick) && !preview;
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {content.required.map((item, i) => (
          <li key={`${i}-${item.when}`} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              {canTick && (
                <input type="checkbox" className="size-4 accent-petrol-800" aria-label={t('required.done', { item: item.when })} checked={done.has(i)} disabled={tick.isPending} onChange={(e) => tick.mutate({ index: i, done: e.target.checked })} />
              )}
              <b className={done.has(i) ? 'text-muted line-through' : 'text-fg'}>{item.when}</b>
              {done.has(i) ? <Badge tone="success">{t('required.doneBadge')}</Badge> : <DeadlineBadge item={item} today={today} />}
            </div>
            {item.lines.map((line, n) => (
              <span key={`${n}-${line}`} className={/^[A-Z]{3}\./.test(line) ? 'font-latin text-fg' : 'text-fg'} dir={/^[A-Z]{3}\./.test(line) ? 'ltr' : undefined}>{line}</span>
            ))}
          </li>
        ))}
      </ul>
      {content.ackText && (
        <Part title={t('required.ackText')}>
          <p className="text-fg">{content.ackText}</p>
        </Part>
      )}
    </div>
  );
}
