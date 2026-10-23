import type { FiguresDeskRef, TicketFiguresBlockDto } from '@arweqah-platform/shared';
import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, DataTable, EmptyState, FormField, PageHeader, Select, StatTile, type Column } from '@/shared/ui';
import { useFigures } from './api';
import { useTicketColumns } from './tickets-columns';

function Tiles({ desk }: { desk: TicketFiguresBlockDto }) {
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

function Outcomes({ desk }: { desk: TicketFiguresBlockDto }) {
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

function Breakdowns({ figures, showDesk }: { figures: TicketFiguresBlockDto; showDesk: boolean }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const desk = <R extends FiguresDeskRef>(): Column<R>[] => (showDesk ? [{ id: 'desk', header: t('columns.desk'), cell: (x) => (ar ? x.deskNameAr : x.deskNameEn) }] : []);
  const types: Column<TicketFiguresBlockDto['byType'][number]>[] = [
    ...desk(),
    { id: 'type', header: t('columns.type'), cell: (x) => (ar ? x.nameAr : x.nameEn) },
    { id: 'count', header: t('figures.count'), className: 'w-24', cell: (x) => <span dir="ltr">{x.count}</span> },
  ];
  const people: Column<TicketFiguresBlockDto['byAssignee'][number]>[] = [
    { id: 'name', header: t('columns.assignee'), cell: (x) => x.name ?? t('groups.unassigned') },
    ...desk(),
    { id: 'open', header: t('figures.open'), cell: (x) => <span dir="ltr">{x.open}</span> },
    { id: 'closed', header: t('figures.closed'), cell: (x) => <span dir="ltr">{x.closed}</span> },
    { id: 'response', header: t('figures.avgFirstResponse'), cell: (x) => (x.avgFirstResponseHours === null ? '—' : t('figures.hours', { count: x.avgFirstResponseHours })) },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DataTable caption={t('figures.byType')} title={t('figures.byType')} columns={types} rows={figures.byType} rowKey={(x) => x.typeId} view="table" />
      <DataTable caption={t('figures.byAssignee')} title={t('figures.byAssignee')} columns={people} rows={figures.byAssignee} rowKey={(x) => `${x.userId ?? 'none'}-${x.deskId}`} view="table" />
    </div>
  );
}

function Attention({ figures, showDesk }: { figures: TicketFiguresBlockDto; showDesk: boolean }) {
  const { t } = useTranslation('tickets');
  // The department column only helps when several departments are listed together.
  const columns = useTicketColumns('inbox').filter((c) => showDesk || c.id !== 'desk');
  return <DataTable caption={t('figures.attention')} title={t('figures.attention')} columns={columns} rows={figures.needsAttention} rowKey={(x) => x.id} empty={<span>{t('figures.attentionEmpty')}</span>} />;
}

/** The last 30 days of one department, or of all of them added up (then the lists say which department each row belongs to). */
export function FiguresPage() {
  const { t, i18n } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const { active } = useAdminMode();
  const [deskId, setDeskId] = useState('');
  const query = useFigures(active, deskId);
  if (!active) return <Alert tone="info">{t('setup.needAdminMode')}</Alert>;
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  if (!query.data) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  const { desks, figures, scope } = query.data;
  if (desks.length === 0) return <EmptyState icon={BarChart3} title={t('figures.none')} description={t('figures.noneHint')} />;
  return (
    <>
      <PageHeader title={t('figures.title')} description={t('figures.description', { days: query.data.windowDays })} />
      <div className="flex flex-col gap-8">
        <div className="max-w-sm">
          <FormField label={t('figures.desk')}>
            {(p) => (
              <Select {...p} value={deskId} onChange={(e) => setDeskId(e.target.value)}>
                <option value="">{t('figures.allDesks')}</option>
                {desks.map((d) => <option key={d.id} value={d.id}>{i18n.language === 'ar' ? d.nameAr : d.nameEn}</option>)}
              </Select>
            )}
          </FormField>
        </div>
        <section aria-label={t('figures.title')} className="flex flex-col gap-5">
          <Attention figures={figures} showDesk={scope === 'all'} />
          <Tiles desk={figures} />
          <Outcomes desk={figures} />
          <Breakdowns figures={figures} showDesk={scope === 'all'} />
        </section>
      </div>
    </>
  );
}
