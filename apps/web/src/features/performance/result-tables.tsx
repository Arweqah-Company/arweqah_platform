import type { MyResultDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

const th = 'px-3 py-2 text-start font-medium';
const td = 'px-3 py-2 text-fg';

/** A table in the card style of this section: a hidden caption for screen readers, a head row, and rows. */
function Grid({ caption, heads, children }: { caption: string; heads: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-neutral-50 text-muted"><tr>{heads.map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** The results criteria: the share, my score and the points it gave. */
export function CriteriaTable({ result }: { result: MyResultDto }) {
  const { t } = useTranslation('performance');
  return (
    <Grid caption={t('result.criteria')} heads={[t('result.criterion'), t('result.share'), t('result.myScore'), t('result.points')]}>
      {result.template.criteria.map((c, i) => {
        const score = result.breakdown.form.results[String(i)] ?? 0;
        return <tr key={c.name} className="border-t border-neutral-200"><td className={td}>{c.name}</td><td className={td} dir="ltr">{c.share}%</td><td className={td} dir="ltr">{score}</td><td className={td} dir="ltr">{Math.round(c.share * score) / 100}</td></tr>;
      })}
    </Grid>
  );
}

/** The behaviours: the level my manager gave and the note. */
export function BehavioursTable({ result }: { result: MyResultDto }) {
  const { t } = useTranslation('performance');
  return (
    <Grid caption={t('result.behaviours')} heads={[t('self.behaviour'), t('self.level'), t('self.note')]}>
      {result.template.behaviours.map((b) => {
        const v = result.breakdown.form.behaviours[b.code];
        return <tr key={b.code} className="border-t border-neutral-200"><td className={td}>{b.name}</td><td className={td}>{v?.level === undefined ? '—' : <Badge tone="neutral">{t(`self.levels.${v.level}`)}</Badge>}</td><td className={td}>{v?.note || '—'}</td></tr>;
      })}
    </Grid>
  );
}

/** The extra component and the calibration, with the reason when the score was moved. */
export function ExtraTable({ result }: { result: MyResultDto }) {
  const { t } = useTranslation('performance');
  const { parts, adjustment, reason } = result.breakdown;
  const rows: [string, number][] = [[t('result.extra.learning'), parts.learning], [t('result.extra.init'), parts.init], [t('result.extra.growth'), parts.growth]];
  return (
    <Grid caption={t('result.extraTitle')} heads={[t('result.part'), t('result.points')]}>
      {rows.map(([name, v]) => <tr key={name} className="border-t border-neutral-200"><td className={td}>{name}</td><td className={td} dir="ltr">{v}</td></tr>)}
      {adjustment !== 0 && <tr className="border-t border-neutral-200"><td className={td}>{t('result.calibration')}{reason ? ` — ${reason}` : ''}</td><td className={td} dir="ltr">{adjustment > 0 ? `+${adjustment}` : adjustment}</td></tr>}
    </Grid>
  );
}
