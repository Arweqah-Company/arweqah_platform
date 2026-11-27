import { CorePermission, type EmployeesSummaryDto } from '@arweqah-platform/shared';
import { lazy, Suspense, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { StatTile } from '@/shared/ui';
import { NoticesHomeSection } from '@/features/notices';
import { MatrixSection, MyTasksPanel, useTaskSummary } from '@/features/tasks';
import { useEmployeesSummary } from '../employees/api';
import { useTicketSummary } from './api';
import { NumbersSection } from './numbers-section';
import { TicketsPanel } from './tickets-panel';

const ChartsSection = lazy(() => import('./charts-section'));

interface Figures {
  headcount: boolean;
  idExpiring: boolean;
  contractEnding: boolean;
}

const attention = (count: number | undefined): 'attention' | 'neutral' => (count ? 'attention' : 'neutral');

const orUndefined = (value: number | null | undefined): number | undefined => value ?? undefined;

/** The employee numbers: each tile only for the person who holds its key (`employees.figures_*`, FR-208). */
function StatsSection({ summary, figures }: { summary: EmployeesSummaryDto | undefined; figures: Figures }) {
  const { t } = useTranslation('home');
  const soon = (value: number | null | undefined) => ({ value: orUndefined(value), hint: t('tiles.soonHint'), tone: attention(orUndefined(value)) });
  const tiles: [boolean, string, Omit<ComponentProps<typeof StatTile>, 'label'>][] = [
    [figures.headcount, t('tiles.total'), { value: orUndefined(summary?.total) }],
    [figures.headcount, t('tiles.active'), { value: orUndefined(summary?.active) }],
    [figures.idExpiring, t('tiles.idExpiring'), soon(summary?.idExpiring)],
    [figures.contractEnding, t('tiles.contractEnding'), soon(summary?.contractEnding)],
    [figures.headcount && !!summary?.needsPlacement, t('tiles.needsPlacement'), { value: orUndefined(summary?.needsPlacement), tone: 'attention' }],
  ];
  return (
    <section aria-label={t('stats')} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.filter(([shown]) => shown).map(([, label, props]) => <StatTile key={label} label={label} {...props} />)}
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
  // The employee numbers are about other people: each card answers to its own key (a plain employee holds none).
  const figures: Figures = { headcount: can(CorePermission.EmployeesFiguresHeadcount), idExpiring: can(CorePermission.EmployeesFiguresIdExpiring), contractEnding: can(CorePermission.EmployeesFiguresContractEnding) };
  const canSeeEmployees = figures.headcount || figures.idExpiring || figures.contractEnding;
  const showMatrix = can(CorePermission.TasksMatrixView) && !hidden.includes('tasks-matrix');
  return {
    me,
    can,
    showTasks,
    showTickets,
    showMatrix,
    canSeeEmployees,
    figures,
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
      <NoticesHomeSection />
      <NumbersSection tasks={h.tasks} tickets={h.tickets} showTasks={h.showTasks} showTickets={h.showTickets} />
      {(h.showTasks || h.showTickets) && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {h.showTasks && <MyTasksPanel summary={h.tasks} />}
          {h.showTickets && <TicketsPanel summary={h.tickets} />}
        </div>
      )}
      <HomeCharts h={h} />
      {h.showMatrix && <MatrixSection />}
      {h.canSeeEmployees && <StatsSection summary={h.employees} figures={h.figures} />}
    </div>
  );
}
