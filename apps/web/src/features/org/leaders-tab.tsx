import { CorePermission, type OrgLeaderCompanyDto, type OrgNodeLeaderDto, type OrgNodeLeadersDto } from '@arweqah-platform/shared';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Avatar, Badge, Button, EmptyState } from '@/shared/ui';
import { useNodeLeaders } from './api';
import type { DetailsContext } from './details-tabs';
import { LeaderActions } from './leader-actions';
import { LeaderDialog } from './leader-dialog';
import { nodeName } from './org-model';

const STATUS_TONE = { current: 'success', scheduled: 'info', past: 'neutral' } as const;

function Window({ leader }: { leader: OrgNodeLeaderDto }) {
  const { t } = useTranslation('org');
  return <span className="text-xs text-muted">{t('leaders.window')} <bdi dir="ltr">{leader.validFrom}</bdi>{leader.validTo && <> {t('leaders.windowTo')} <bdi dir="ltr">{leader.validTo}</bdi></>}</span>;
}

/** The person with their company, the dates, and (for a leader that is not the current one) what state the row is in. */
function Person({ leader, withStatus }: { leader: OrgNodeLeaderDto; withStatus?: boolean }) {
  const { t, i18n } = useTranslation('org');
  return (
    <div className="flex items-center gap-3">
      <Avatar name={leader.employeeName} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">{leader.employeeName}{withStatus && <Badge tone={STATUS_TONE[leader.status]}>{t(`leaders.status.${leader.status}`)}</Badge>}</p>
        <p className="text-xs text-muted">{i18n.language === 'ar' ? leader.companyNameAr : leader.companyNameEn} · <Window leader={leader} /></p>
      </div>
    </div>
  );
}

function SharedLeader({ company, nodeId }: { company: OrgLeaderCompanyDto | undefined; nodeId: string }) {
  const { t } = useTranslation('org');
  return (
    <section aria-label={t('leaders.sharedLabel')} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3">
      {company?.leader
        ? <div className="flex items-center justify-between gap-2"><Person leader={company.leader} /><LeaderActions nodeId={nodeId} leader={company.leader} /></div>
        : <p className="text-sm text-muted">{t('leaders.noSharedLeader')}</p>}
      <p className="text-xs text-muted">{t('leaders.sharedNote')}</p>
    </section>
  );
}

/** Who leads for a company that has none: the nearest unit above that has one, or nobody. */
function Escalation({ company }: { company: OrgLeaderCompanyDto }) {
  const { t, i18n } = useTranslation('org');
  const up = company.escalatesTo;
  if (up) return <p className="mt-1 text-xs text-muted">{t('leaders.escalates', { name: up.employeeName, unit: i18n.language === 'ar' ? up.nodeNameAr : up.nodeNameEn })}</p>;
  return company.staffCount > 0 ? <p className="mt-1 text-xs text-muted">{t('leaders.noLeaderAbove')}</p> : null;
}

function CompaniesTable({ companies, nodeId }: { companies: OrgLeaderCompanyDto[]; nodeId: string }) {
  const { t, i18n } = useTranslation('org');
  if (companies.length === 0) return <EmptyState icon={UserPlus} title={t('leaders.noCompanies')} description={t('leaders.noCompaniesHint')} />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('leaders.tableLabel')}</caption>
        <thead className="bg-neutral-50 text-start text-xs text-muted"><tr><th scope="col" className="p-2 text-start font-medium">{t('leaders.company')}</th><th scope="col" className="p-2 text-start font-medium">{t('leaders.leader')}</th><th scope="col" className="p-2 text-start font-medium">{t('leaders.employees')}</th></tr></thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.companyId} className="border-t border-neutral-200 align-top">
              <td className="p-2 font-medium">{i18n.language === 'ar' ? c.nameAr : c.nameEn}</td>
              <td className="p-2">
                {c.leader ? <div className="flex items-center justify-between gap-2"><Person leader={c.leader} /><LeaderActions nodeId={nodeId} leader={c.leader} /></div> : <><Badge tone="danger">{t('leaders.noLeader')}</Badge><Escalation company={c} /></>}
              </td>
              <td className="p-2"><span dir="ltr">{c.staffCount}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Acting leaders and leaders that start later, with their window and state; everything else is in the table above. */
function ActingList({ items, nodeId }: { items: OrgNodeLeaderDto[]; nodeId: string }) {
  const { t } = useTranslation('org');
  const rows = items.filter((i) => i.status !== 'past' && (i.kind === 'acting' || i.status === 'scheduled'));
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="acting-title" className="flex flex-col gap-2">
      <h3 id="acting-title" className="text-sm font-bold">{t('leaders.actingTitle')}</h3>
      <ul className="flex flex-col gap-2">
        {rows.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200 px-3 py-2">
            <div className="min-w-0"><Person leader={l} withStatus /><p className="mt-1 text-xs text-muted">{t(`leaders.kinds.${l.kind}`)} · {l.reason}</p></div>
            <LeaderActions nodeId={nodeId} leader={l} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LeadersBody({ leaders, ctx, onAssign }: { leaders: OrgNodeLeadersDto; ctx: DetailsContext; onAssign: () => void }) {
  const { t, i18n } = useTranslation('org');
  const shared = leaders.effectiveMode === 'shared';
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t('leaders.roleNote', { name: nodeName(ctx.node, i18n.language === 'ar') })}</Alert>
      {shared ? <SharedLeader company={leaders.companies.find((c) => c.companyId === leaders.groupCompanyId)} nodeId={ctx.node.id} /> : <CompaniesTable companies={leaders.companies} nodeId={ctx.node.id} />}
      <ActingList items={leaders.items} nodeId={ctx.node.id} />
      <Can adminMode permission={CorePermission.OrgLeadersManage}><Button size="sm" variant="secondary" className="self-start" onClick={onAssign}><UserPlus className="size-4" aria-hidden />{t('leaders.assign')}</Button></Can>
    </div>
  );
}

/** Who leads the unit (FR-100): one leader from the group company when it is shared, one per company otherwise; acting leaders with their window; appoint, end and remove. */
export function LeadersTab(ctx: DetailsContext) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const [assigning, setAssigning] = useState(false);
  const query = useNodeLeaders(ctx.node.id);
  if (query.isPending) return <p role="status" className="text-sm text-muted">{t('leaders.loading')}</p>;
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  return (
    <>
      <LeadersBody leaders={query.data} ctx={ctx} onAssign={() => setAssigning(true)} />
      {assigning && <LeaderDialog node={ctx.node} leaders={query.data} onClose={() => setAssigning(false)} />}
    </>
  );
}

