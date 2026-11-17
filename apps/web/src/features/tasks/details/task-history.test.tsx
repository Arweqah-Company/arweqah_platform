import type { TaskDto, TaskEventDto } from '@arweqah-platform/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../../../test/render';
import { taskDetail } from '../../../../test/task-fixtures';
import { TaskHistory } from './task-history';

const event = (over: Partial<TaskEventDto>): TaskEventDto => ({ id: 'e', type: 'created', actor: { id: 'u1', name: 'أحمد العتيبي' }, fromStatus: null, toStatus: null, note: null, createdAt: '2026-10-19T09:00:00.000Z', ...over });
const task = (events: TaskEventDto[]): TaskDto => taskDetail({ events });

describe('Task history as a table (FR-159)', () => {
  it('shows a count and a button, and opens the history only when asked', async () => {
    renderPage(<TaskHistory task={task([event({ id: 'e1' }), event({ id: 'e2', type: 'approved' })])} />);
    expect(screen.getByText('عدد الأحداث: 2')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'عرض السجل' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('draws one numbered row per event, oldest first, with who, the event and its details', async () => {
    const events = [
      event({ id: 'e1' }),
      event({ id: 'e2', type: 'time_logged', actor: { id: 'u2', name: 'ساره مجدى' }, note: '50' }),
      event({ id: 'e3', type: 'objected', actor: { id: 'u2', name: 'ساره مجدى' }, note: 'not_enough_time' }),
      event({ id: 'e4', type: 'objection_expired', actor: null }),
      event({ id: 'e5', type: 'transitioned', actor: { id: 'u2', name: 'ساره مجدى' }, fromStatus: 'todo', toStatus: 'in_progress' }),
    ];
    renderPage(<TaskHistory task={task(events)} />);
    fireEvent.click(screen.getByRole('button', { name: 'عرض السجل' }));
    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
    expect(within(rows[0]!).getByText('أُنشئت')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('50 دقيقة')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('اعتراض')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('سقط الاعتراض')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('النظام')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('للتنفيذ')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('قيد التنفيذ')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('ساره مجدى')).toBeInTheDocument();
  });
});
