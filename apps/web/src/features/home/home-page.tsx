import { CorePermission, type EmployeesSummaryDto } from '@arweqah-platform/shared';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { useReach } from '@/core/permissions/use-access';
import { StatTile } from '@/shared/ui';
import { MatrixSection, MyTasksPanel, useTaskSummary } from '@/features/tasks';
import { useEmployeesSummary } from '../employees/api';
import { useTicketSummary } from './api';
import { NumbersSection } from './numbers-section';
import { TicketsPanel } from './tickets-panel';

const ChartsSection = lazy(() => import('./charts-section'));

const attention = (count: number | undefined) => (count ? 'attention' : 'neutral');

function StatsSection({ summary }: { summary: EmployeesSummaryDto | undefined }) {
  const { t } = useTranslation('home');
  return (
    <section aria-label={t('stats')} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label={t('tiles.total')} value={summary?.total} />
      <StatTile label={t('tiles.active')} value={summary?.active} />
      <StatTile label={t('tiles.idExpiring')} value={summary?.idExpiring} hint={t('tiles.soonHint')} tone={attention(summary?.idExpiring)} />
      <StatTile label={t('tiles.contractEnding')} value={summary?.contractEnding} hint={t('tiles.soonHint')} tone={attention(summary?.contractEnding)} />
      {!!summary?.needsPlacement && <StatTile label={t('tiles.needsPlacement')} value={summary.needsPlacement} tone="attention" />}
    </section>
  );
}

function HomeCharts({ h }: { h: ReturnType<typeof useHomeData> }) {
  const { t } = useTranslation('home');
  if (!h.showTasks && !h.showTickets && !h.canSeeEmployees) return null;
  return (
    <Suspense fallback={<div role="status" aria-label={t('loading')} className="mt-8 h-56 animate-pulse rounded-3xl bg-neutral-50" />}>
      <ChartsSection tasks={h.tasks} tickets={h.tickets} employees={h.employees} showTasks={h.showTasks} showTickets={h.showTickets} showEmployees={h.canSeeEmployees} />
    </Suspense>
  );
}

/** What the person may see on the home page, and the numbers behind it (a section is asked for only when its key is held and its page is not hidden). */
function useHomeData() {
  const me = useMe().data;
  const { can } = usePermissions();
  const hidden = me?.hiddenPages ?? [];
  const showTasks = can(CorePermission.TasksView) && !hidden.includes('tasks');
  const showTickets = can(CorePermission.TicketsView) && !hidden.includes('tickets');
  // The employee counts are about other people: a plain employee (view reaches only their own record) has none.
  const employeesReach = useReach(CorePermission.EmployeesView);
  const canSeeEmployees = !!employeesReach && employeesReach !== 'own';
  const showMatrix = can(CorePermission.TasksMatrixView) && !hidden.includes('tasks-matrix');
  return {
    me,
    can,
    showTasks,
    showTickets,
    showMatrix,
    canSeeEmployees,
    employees: useEmployeesSummary(canSeeEmployees).data,
    tasks: useTaskSummary(showTasks).data,
    tickets: useTicketSummary(showTickets).data,
  };
}

/** The landing page: my numbers, my tasks and tickets, charts of the same numbers, and the employee counts for those who may see them. */
export function HomePage() {
  const { t } = useTranslation('home');
  const h = useHomeData();
  return (
    <div>
      <h1 data-tour="page-title" className="text-3xl font-bold">{t('greeting', { name: h.me?.name.split(' ')[0] ?? '' })}</h1>
      <p className="mt-2 max-w-[65ch] text-muted">{t('intro')}</p>
      <NumbersSection tasks={h.tasks} tickets={h.tickets} showTasks={h.showTasks} showTickets={h.showTickets} />
      {(h.showTasks || h.showTickets) && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {h.showTasks && <MyTasksPanel summary={h.tasks} />}
          {h.showTickets && <TicketsPanel summary={h.tickets} />}
        </div>
      )}
      <HomeCharts h={h} />
      {h.showMatrix && <MatrixSection />}
      {h.canSeeEmployees && <StatsSection summary={h.employees} />}
    </div>
  );
}
