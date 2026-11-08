import type { CareerContent } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
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
export function RequiredSection({ content, today = new Date() }: { content: CareerContent; today?: Date }) {
  const { t } = useTranslation('career-profile');
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {content.required.map((item, i) => (
          <li key={`${i}-${item.when}`} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-fg">{item.when}</b>
              <DeadlineBadge item={item} today={today} />
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
