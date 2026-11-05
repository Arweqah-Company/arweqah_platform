import type { OrgChangeLogLineDto, OrgNodeVersionDto, OrgVersionStatus } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Badge } from '@/shared/ui';
import { useNodeVersions } from './api';
import type { DetailsContext } from './details-tabs';
import { UnitCode } from './unit-badges';

const STATUS_TONE: Record<OrgVersionStatus, 'success' | 'info' | 'neutral'> = { current: 'success', scheduled: 'info', past: 'neutral' };
/** The dot of the timeline: filled for what holds now, hollow and dashed for what waits. */
const DOT: Record<OrgVersionStatus, string> = { current: 'border-green-400 bg-green-400', past: 'border-neutral-500 bg-neutral-500', scheduled: 'border-dashed border-link bg-white' };

function Version({ version, last }: { version: OrgNodeVersionDto; last: boolean }) {
  const { t, i18n } = useTranslation('org');
  const name = (i18n.language === 'ar' ? version.nameAr : version.nameEn) || version.nameAr;
  return (
    <li className="flex gap-3" data-status={version.status}>
      <div aria-hidden className="flex flex-col items-center">
        <span className={cn('mt-1 size-3.5 shrink-0 rounded-full border-2', DOT[version.status])} />
        {!last && <span className="w-0.5 grow bg-neutral-200" />}
      </div>
      <div className="mb-4 min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2"><b>{name}</b><Badge tone={STATUS_TONE[version.status]}>{t(`history.status.${version.status}`)}</Badge>{!version.isActive && <Badge>{t('status.inactive')}</Badge>}{version.code && <UnitCode code={version.code} />}</p>
        <p className="text-xs text-muted">{t('history.from')} <bdi dir="ltr">{version.validFrom}</bdi>{version.validTo && <> {t('history.to')} <bdi dir="ltr">{version.validTo}</bdi></>} · {version.reason}</p>
        {version.createdByName && <p className="text-xs text-muted">{t('history.by', { name: version.createdByName })}</p>}
      </div>
    </li>
  );
}

/** The action's name in words; an action the screen does not know is shown as it was recorded. */
const actionKey = (action: string): string => `history.actions.${action.replace(/[.-]/g, '_')}`;

function LogTable({ lines }: { lines: OrgChangeLogLineDto[] }) {
  const { t } = useTranslation('org');
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Riyadh' });
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('history.logTitle')}</caption>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-t border-neutral-200 align-top first:border-t-0">
              <td className="whitespace-nowrap p-2 text-xs text-muted"><bdi dir="ltr">{date.format(new Date(l.createdAt))}</bdi></td>
              <td className="p-2">{t(actionKey(l.action), { defaultValue: l.action })}{l.actorName && <span className="text-muted"> · {l.actorName}</span>}{l.reason && <p className="text-xs text-muted">{t('history.reason', { reason: l.reason })}</p>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The unit through time (FR-99): current, previous and scheduled versions with their dates and reasons, and the change log. */
export function HistoryTab({ node }: DetailsContext) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const query = useNodeVersions(node.id);
  if (query.isPending) return <p role="status" className="text-sm text-muted">{t('history.loading')}</p>;
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  const { versions, log } = query.data;
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label={t('history.timeline')}>{versions.map((v, i) => <Version key={v.id ?? v.validFrom} version={v} last={i === versions.length - 1} />)}</ul>
      <section aria-labelledby="log-title" className="flex flex-col gap-2">
        <h3 id="log-title" className="text-sm font-bold">{t('history.logTitle')}</h3>
        {log.length > 0 ? <LogTable lines={log} /> : <p className="text-sm text-muted">{t('history.logEmpty')}</p>}
      </section>
      <p className="text-xs text-muted">{t('history.note')}</p>
    </div>
  );
}
