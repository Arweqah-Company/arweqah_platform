import { TASK_NOTICE_DEFAULTS, type TaskNoticeSettings } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { chooseOption } from '../../../../test/select';
import { TaskNoticeSection } from './task-notice-section';

function serve(initial: TaskNoticeSettings = TASK_NOTICE_DEFAULTS) {
  const saved: TaskNoticeSettings[] = [];
  server.use(
    http.get('*/api/task-notice-settings', () => HttpResponse.json(initial)),
    http.put('*/api/task-notice-settings', async ({ request }) => {
      const body = (await request.json()) as TaskNoticeSettings;
      saved.push(body);
      return HttpResponse.json(body);
    }),
  );
  return saved;
}

describe('Task summary and reminders settings (FR-215…FR-218)', () => {
  it('shows what is saved: the channel, the daily summary and its hour, the reminders', async () => {
    serve({ channel: 'both', digestEnabled: true, digestHour: 14, remindersEnabled: false });
    renderPage(<TaskNoticeSection />);
        expect(await screen.findByLabelText('القناة')).toHaveTextContent('إشعار وبريد معًا');
    expect(screen.getByLabelText('وقت الملخص (توقيت الرياض)')).toHaveTextContent('14:00');
    expect(screen.getByRole('checkbox', { name: /ملخص يومي بمهامي/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /تذكيري بمهامي/ })).not.toBeChecked();
  });

  it('saves the channel, the hour and the switches as chosen', async () => {
    const saved = serve();
    renderPage(<TaskNoticeSection />);
    await chooseOption(await screen.findByLabelText('القناة'), 'email');
    await chooseOption(screen.getByLabelText('وقت الملخص (توقيت الرياض)'), '16');
    fireEvent.click(screen.getByRole('checkbox', { name: /تذكيري بمهامي/ }));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({ channel: 'email', digestEnabled: true, digestHour: 16, remindersEnabled: false });
  });

  it('locks the hour while the daily summary is off', async () => {
    serve();
    renderPage(<TaskNoticeSection />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /ملخص يومي بمهامي/ }));
    expect(screen.getByLabelText('وقت الملخص (توقيت الرياض)')).toBeDisabled();
  });
});
