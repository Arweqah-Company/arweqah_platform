import { CorePermission, type AuditLogDto, type EmployeesSummaryDto, type Paginated } from '@arweqah-platform/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { apiClient } from '@/core/api/api-client';
import { useMe } from '@/core/auth/session';
import { useNavItems } from '@/core/navigation';
import { usePermissions } from '@/core/permissions/can';
import { StatTile } from '@/shared/ui';
import { MatrixSection, MyTasksPanel, useTaskSummary } from '@/features/tasks';
import { useEmployeesSummary } from '../employees/api';
import { useTicketSummary } from './api';
import { NumbersSection } from './numbers-section';
import { TicketsPanel } from './tickets-panel';

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

function Shortcuts() {
  const { t } = useTranslation('home');
  const { t: tc } = useTranslation();
  const items = useNavItems().filter((n) => n.to !== '/');
  return (
    <section>
      <h2 className="text-lg font-bold">{t('shortcuts')}</h2>
      <ul className="mt-4">
        {items.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="group flex items-center gap-3 rounded-[var(--radius-control)] border-b border-neutral-200 px-2 py-3 transition-colors duration-150 hover:bg-petrol-50 hover:text-link">
              <Icon className="size-4 text-link transition-transform duration-150 group-hover:scale-110" aria-hidden />
              {tc(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentActivity() {
  const { t } = useTranslation('home');
  const entries = useQuery({ queryKey: ['audit', 'recent'], queryFn: () => apiClient.get<Paginated<AuditLogDto>>('/audit-logs', { pageSize: 5 }) }).data?.items ?? [];
  if (!entries.length) return null;
  return (
    <section>
      <h2 className="text-lg font-bold">{t('recent')}</h2>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.id} className="flex justify-between gap-3 border-b border-neutral-200 pb-2">
            <span dir="ltr">{entry.action}</span>
            <span className="text-xs text-muted" dir="ltr">{new Date(entry.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the person may see on the home page, and the numbers behind it (a section is asked for only when its key is held and its page is not hidden). */
function useHomeData() {
  const me = useMe().data;
  const { can } = usePermissions();
  const hidden = me?.hiddenPages ?? [];
  const showTasks = can(CorePermission.TasksView) && !hidden.includes('tasks');
  const showTickets = can(CorePermission.TicketsView) && !hidden.includes('tickets');
  const canSeeEmployees = can(CorePermission.EmployeesView);
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

/** The landing page: my numbers, my tasks and tickets, the employee counts for those who may see them, recent activity, and shortcuts. */
export function HomePage() {
  const { t } = useTranslation('home');
  const h = useHomeData();
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('greeting', { name: h.me?.name.split(' ')[0] ?? '' })}</h1>
      <p className="mt-2 max-w-[65ch] text-muted">{t('intro')}</p>
      <NumbersSection tasks={h.tasks} tickets={h.tickets} showTasks={h.showTasks} showTickets={h.showTickets} />
      {(h.showTasks || h.showTickets) && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {h.showTasks && <MyTasksPanel summary={h.tasks} />}
          {h.showTickets && <TicketsPanel summary={h.tickets} />}
        </div>
      )}
      {h.showMatrix && <MatrixSection />}
      {h.canSeeEmployees && <StatsSection summary={h.employees} />}
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Shortcuts />
        {h.can(CorePermission.AuditView) && <RecentActivity />}
      </div>
    </div>
  );
}
