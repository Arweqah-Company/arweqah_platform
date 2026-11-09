import { FISCAL_MILESTONE, type FiscalCard } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

/** The fiscal year month by month (a milestone or a daily follow-up), with the notes of the months that have one. */
export function FiscalCardTab({ card }: { card: FiscalCard }) {
  const { t } = useTranslation('performance');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-bold text-fg">{t('evaluation.fiscal')}</h3>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {card.months.map((m, i) => (
          <li key={`${m.month}-${i}`} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-2"><b className="text-fg">{m.month}</b><Badge tone={m.kind === FISCAL_MILESTONE ? 'warning' : 'neutral'}>{m.kind}</Badge></li>
        ))}
      </ul>
      {card.notes.map((n) => (
        <details key={n.month} className="rounded-2xl border border-neutral-200 bg-white p-3"><summary className="cursor-pointer font-bold text-fg">{n.month}</summary><p className="mt-1 text-fg">{n.text}</p></details>
      ))}
    </div>
  );
}
