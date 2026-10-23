import type { TicketFiguresDeskDto } from '@arweqah-platform/shared';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, DataTable, EmptyState, PageHeader, StatTile, type Column } from '@/shared/ui';
import { useFigures } from './api';
import { useTicketColumns } from './tickets-columns';

function Tiles({ desk }: { desk: TicketFiguresDeskDto }) {
  const { t } = useTranslation('tickets');
  const hours = (v: number | null) => (v === null ? '—' : t('figures.hours', { count: v }));
  return (
    <section aria-label={t('figures.indicators')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label={t('figures.openNow')} value={desk.openNow} />
      <StatTile label={t('figures.incoming')} value={desk.incoming} hint={desk.personalCount > 0 ? t('figures.personalCount', { count: desk.personalCount }) : undefined} />
      <StatTile label={t('figures.avgFirstResponse')} value={hours(desk.avgFirstResponseHours)} />
      <StatTile label={t('figures.avgResolution')} value={hours(desk.avgResolutionHours)} />
    </section>
  );
}

function Outcomes({ desk }: { desk: TicketFiguresDeskDto }) {
  const { t } = useTranslation('tickets');
  const items: [string, number][] = [
    [t('figures.confirmed'), desk.outcomes.confirmed],
    [t('figures.auto'), desk.outcomes.auto],
    [t('figures.notExecuted'), desk.outcomes.notExecuted],
    [t('figures.reopened'), desk.outcomes.reopened],
  ];
  return (
    <section aria-label={t('figures.outcomes')} className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">{t('figures.outcomes')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(([label, value]) => <StatTile key={label} label={label} value={value} />)}</div>
    </section>
  );
}

function Breakdowns({ desk }: { desk: TicketFiguresDeskDto }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const types: Column<TicketFiguresDeskDto['byType'][number]>[] = [
    { id: 'type', header: t('columns.type'), cell: (x) => (ar ? x.nameAr : x.nameEn) },
    { id: 'count', header: t('figures.count'), className: 'w-24', cell: (x) => <span dir="ltr">{x.count}</span> },
  ];
  const people: Column<TicketFiguresDeskDto['byAssignee'][number]>[] = [
    { id: 'name', header: t('columns.assignee'), cell: (x) => x.name ?? t('groups.unassigned') },
    { id: 'open', header: t('figures.open'), cell: (x) => <span dir="ltr">{x.open}</span> },
    { id: 'closed', header: t('figures.closed'), cell: (x) => <span dir="ltr">{x.closed}</span> },
    { id: 'response', header: t('figures.avgFirstResponse'), cell: (x) => (x.avgFirstResponseHours === null ? '—' : t('figures.hours', { count: x.avgFirstResponseHours })) },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DataTable caption={t('figures.byType')} title={t('figures.byType')} columns={types} rows={desk.byType} rowKey={(x) => x.typeId} view="table" />
      <DataTable caption={t('figures.byAssignee')} title={t('figures.byAssignee')} columns={people} rows={desk.byAssignee} rowKey={(x) => x.userId ?? 'none'} view="table" />
    </div>
  );
}

function Attention({ desk }: { desk: TicketFiguresDeskDto }) {
  const { t } = useTranslation('tickets');
  const columns = useTicketColumns('inbox');
  return <DataTable caption={t('figures.attention')} title={t('figures.attention')} columns={columns} rows={desk.needsAttention} rowKey={(x) => x.id} empty={<span>{t('figures.attentionEmpty')}</span>} />;
}

/** The last 30 days of one department: what needs action today, the indicators, how tickets ended, and the breakdowns. */
export function FiguresPage() {
  const { t, i18n } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const { active } = useAdminMode();
  const query = useFigures(active);
  if (!active) return <Alert tone="info">{t('setup.needAdminMode')}</Alert>;
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  if (!query.data) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  const desks = query.data.desks;
  if (desks.length === 0) return <EmptyState icon={BarChart3} title={t('figures.none')} description={t('figures.noneHint')} />;
  return (
    <>
      <PageHeader title={t('figures.title')} description={t('figures.description', { days: query.data.windowDays })} />
      <div className="flex flex-col gap-8">
        {desks.map((desk) => (
          <section key={desk.deskId} aria-label={i18n.language === 'ar' ? desk.nameAr : desk.nameEn} className="flex flex-col gap-5">
            <h2 className="text-xl font-bold">{i18n.language === 'ar' ? desk.nameAr : desk.nameEn}</h2>
            <Attention desk={desk} />
            <Tiles desk={desk} />
            <Outcomes desk={desk} />
            <Breakdowns desk={desk} />
          </section>
        ))}
      </div>
    </>
  );
}
