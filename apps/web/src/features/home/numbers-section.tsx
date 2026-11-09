import type { TaskSummaryDto, TicketSummaryDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StatTile } from '@/shared/ui';

const attention = (count: number | undefined) => (count ? 'attention' : 'neutral');

/** A tile that opens the list it counts. */
function Tile({ to, label, value, hint, tone }: { to: string; label: string; value: number | string | undefined; hint?: string; tone?: 'neutral' | 'attention' }) {
  return (
    <Link to={to} className="block rounded-[var(--radius-panel)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link">
      <StatTile label={label} value={value} hint={hint} tone={tone} />
    </Link>
  );
}

function TaskTiles({ tasks }: { tasks: TaskSummaryDto | undefined }) {
  const { t } = useTranslation('home');
  return (
    <>
      <Tile to="/tasks" label={t('numbers.tasksOpen')} value={tasks?.open} />
      <Tile to="/tasks?filter=overdue" label={t('numbers.tasksOverdue')} value={tasks?.overdue} tone={attention(tasks?.overdue)} />
      <Tile to="/tasks" label={t('numbers.tasksSoon')} value={tasks?.dueSoon} hint={t('numbers.soonHint')} />
      <Tile to="/tasks" label={t('numbers.tasksDone')} value={tasks?.doneRecently} hint={t('numbers.doneHint')} />
      <Tile to="/tasks" label={t('numbers.onTime')} value={tasks?.onTimeRate == null ? '—' : `${tasks.onTimeRate}%`} hint={t('numbers.doneHint')} />
      <WaitingTiles tasks={tasks} />
      {tasks?.team && <TeamTiles team={tasks.team} />}
    </>
  );
}

/** Reviews and approvals waiting for me appear only when there is something to do. */
function WaitingTiles({ tasks }: { tasks: TaskSummaryDto | undefined }) {
  const { t } = useTranslation('home');
  return (
    <>
      {!!tasks?.awaitingMyReview && <Tile to="/tasks" label={t('numbers.tasksReview')} value={tasks.awaitingMyReview} tone="attention" />}
      {!!tasks?.awaitingMyApproval && <Tile to="/tasks?tab=team" label={t('numbers.tasksApproval')} value={tasks.awaitingMyApproval} tone="attention" />}
    </>
  );
}

function TeamTiles({ team }: { team: NonNullable<TaskSummaryDto['team']> }) {
  const { t } = useTranslation('home');
  return (
    <>
      <Tile to="/tasks?tab=team" label={t('numbers.teamOverdue')} value={team.overdue} tone={attention(team.overdue)} />
      <Tile to="/tasks?tab=team" label={t('numbers.teamStale')} value={team.stale} />
      <Tile to="/tasks?tab=team" label={t('numbers.teamDone')} value={team.doneThisWeek} hint={t('numbers.weekHint')} />
    </>
  );
}

function TicketTiles({ tickets }: { tickets: TicketSummaryDto | undefined }) {
  const { t } = useTranslation('home');
  return (
    <>
      <Tile to="/tickets" label={t('numbers.ticketsSent')} value={tickets?.sentOpen} />
      <Tile to="/tickets" label={t('numbers.ticketsConfirm')} value={tickets?.awaitingMyConfirmation} tone={attention(tickets?.awaitingMyConfirmation)} />
      <Tile to="/tickets" label={t('numbers.ticketsReply')} value={tickets?.awaitingMyReply} tone={attention(tickets?.awaitingMyReply)} />
    </>
  );
}

/** "My numbers": my tasks and my tickets, each part only for those who hold its key (the API sends nothing else). */
export function NumbersSection({ tasks, tickets, showTasks, showTickets }: { tasks: TaskSummaryDto | undefined; tickets: TicketSummaryDto | undefined; showTasks: boolean; showTickets: boolean }) {
  const { t } = useTranslation('home');
  if (!showTasks && !showTickets) return null;
  return (
    <section aria-label={t('numbers.title')} data-tour="main-list" className="mt-8">
      <h2 className="mb-4 text-lg font-bold">{t('numbers.title')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showTasks && <TaskTiles tasks={tasks} />}
        {showTickets && <TicketTiles tickets={tickets} />}
      </div>
    </section>
  );
}
