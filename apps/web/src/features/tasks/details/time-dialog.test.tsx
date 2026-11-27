import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { taskDetail } from '../../../../test/task-fixtures';
import { TimeDialog } from './time-dialog';

function open() {
  const sent: unknown[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.post('*/api/tasks/:id/time', async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json(taskDetail());
    }),
  );
  renderPage(<TimeDialog taskId="t1" onClose={() => undefined} />);
  return { sent, save: screen.getByRole('button', { name: 'تسجيل' }), hours: screen.getByLabelText(/الساعات/), minutes: screen.getByLabelText('الدقائق') };
}

describe('Time dialog: hours and minutes (FR-200)', () => {
  it('sends hours and minutes as minutes', async () => {
    const { sent, save, hours, minutes } = open();
    expect(save).toBeDisabled();
    fireEvent.change(hours, { target: { value: '1' } });
    fireEvent.change(minutes, { target: { value: '30' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual(expect.objectContaining({ minutes: 90 }));
  });

  it('accepts hours alone or minutes alone', () => {
    const { save, hours, minutes } = open();
    fireEvent.change(minutes, { target: { value: '45' } });
    expect(save).toBeEnabled();
    fireEvent.change(minutes, { target: { value: '' } });
    fireEvent.change(hours, { target: { value: '8' } });
    expect(save).toBeEnabled();
  });

  it('says what is wrong when the time is longer than a day and keeps the save button off', async () => {
    const { save, hours, minutes } = open();
    fireEvent.change(hours, { target: { value: '33' } });
    fireEvent.change(minutes, { target: { value: '20' } });
    expect(await screen.findByText(/اليوم 24 ساعة فقط، وأنت كتبت 33 ساعة و20 دقيقة/)).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(hours, { target: { value: '24' } });
    fireEvent.change(minutes, { target: { value: '0' } });
    expect(screen.queryByText(/اليوم 24 ساعة فقط/)).not.toBeInTheDocument();
    expect(save).toBeEnabled();
  });

  it('refuses minutes above 59 and a time of zero, each with its message', async () => {
    const { save, hours, minutes } = open();
    fireEvent.change(minutes, { target: { value: '90' } });
    expect(await screen.findByText(/الدقائق عدد صحيح من 0 إلى 59/)).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(minutes, { target: { value: '0' } });
    fireEvent.change(hours, { target: { value: '0' } });
    expect(await screen.findByText(/اكتب الوقت الذي عملته/)).toBeInTheDocument();
    expect(save).toBeDisabled();
  });
});
