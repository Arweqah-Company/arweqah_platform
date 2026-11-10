import type { EmployeesSummaryDto, TaskStatus, TaskSummaryDto, TicketSummaryDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { BarsChart, DonutChart, type ChartPart } from '@/shared/ui';

const TASK_STATUS_FILL: { status: TaskStatus; fill: ChartPart['fill'] }[] = [
  { status: 'todo', fill: 'fill-neutral-500' },
  { status: 'in_progress', fill: 'fill-petrol-800' },
  { status: 'awaiting_review', fill: 'fill-orange-500' },
  { status: 'pending_approval', fill: 'fill-green-400' },
];

export interface ChartsData {
  tasks: TaskSummaryDto | undefined;
  tickets: TicketSummaryDto | undefined;
  employees: EmployeesSummaryDto | undefined;
  showTasks: boolean;
  showTickets: boolean;
  showEmployees: boolean;
}

/** Finished in the last 30 days split by on time and late, next to what is overdue now. */
function onTimeParts(tasks: TaskSummaryDto, label: (key: string) => string): ChartPart[] {
  const onTime = Math.round((tasks.doneRecently * (tasks.onTimeRate ?? 0)) / 100);
  return [
    { key: 'onTime', label: label('onTime'), value: onTime, fill: 'fill-green-400' },
    { key: 'late', label: label('late'), value: tasks.doneRecently - onTime, fill: 'fill-orange-500' },
    { key: 'overdue', label: label('overdueOpen'), value: tasks.overdue, fill: 'fill-neutral-500' },
  ];
}

function TaskCharts({ tasks }: { tasks: TaskSummaryDto }) {
  const { t } = useTranslation('home');
  const { t: tt } = useTranslation('tasks');
  const byStatus = TASK_STATUS_FILL.map(({ status, fill }) => ({ key: status, label: tt(`status.${status}`), value: tasks.byStatus[status] ?? 0, fill }));
  return (
    <>
      <DonutChart title={t('charts.tasksByStatus')} label={t('charts.tasksByStatusLabel')} parts={byStatus} empty={t('charts.empty')} />
      <BarsChart title={t('charts.tasksOnTime')} label={t('charts.tasksOnTimeLabel')} parts={onTimeParts(tasks, (k) => t(`charts.${k}`))} empty={t('charts.empty')} />
    </>
  );
}

function TicketChart({ tickets }: { tickets: TicketSummaryDto }) {
  const { t } = useTranslation('home');
  const parts: ChartPart[] = [
    { key: 'sent', label: t('charts.sentInProgress'), value: Math.max(0, tickets.sentOpen - tickets.awaitingMyConfirmation), fill: 'fill-petrol-800' },
    { key: 'confirm', label: t('numbers.ticketsConfirm'), value: tickets.awaitingMyConfirmation, fill: 'fill-orange-500' },
    { key: 'reply', label: t('numbers.ticketsReply'), value: tickets.awaitingMyReply, fill: 'fill-green-400' },
  ];
  return <DonutChart title={t('charts.ticketsByStatus')} label={t('charts.ticketsByStatusLabel')} parts={parts} empty={t('charts.empty')} />;
}

function EmployeeChart({ employees }: { employees: EmployeesSummaryDto }) {
  const { t } = useTranslation('home');
  const parts: ChartPart[] = [
    { key: 'active', label: t('tiles.active'), value: employees.active, fill: 'fill-green-400' },
    { key: 'id', label: t('tiles.idExpiring'), value: employees.idExpiring, fill: 'fill-orange-500' },
    { key: 'contract', label: t('tiles.contractEnding'), value: employees.contractEnding, fill: 'fill-petrol-800' },
  ];
  return <BarsChart title={t('charts.employees')} label={t('charts.employeesLabel')} parts={parts} empty={t('charts.empty')} />;
}

/** Charts of the same summaries the numbers use; each appears only with its section's key (nothing more is asked of the API). */
export default function ChartsSection(d: ChartsData) {
  const { t } = useTranslation('home');
  return (
    <section aria-label={t('charts.title')} data-tour="home-charts" className="mt-8">
      <h2 className="mb-4 text-lg font-bold">{t('charts.title')}</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {d.showTasks && d.tasks && <TaskCharts tasks={d.tasks} />}
        {d.showTickets && d.tickets && <TicketChart tickets={d.tickets} />}
        {d.showEmployees && d.employees && <EmployeeChart employees={d.employees} />}
      </div>
    </section>
  );
}
