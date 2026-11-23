import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { ReadDialog } from '../mine/read-dialog';
import { mineItem } from './notices-fixtures';

const serve = (notice = mineItem()) => server.use(http.get('*/api/me', () => HttpResponse.json(me())), http.get('*/api/notices/mine/m1', () => HttpResponse.json(notice)));

describe('Read and acknowledge (FR-169, FR-173)', () => {
  it('keeps «Acknowledge» off until the box is ticked, then records the acknowledgement', async () => {
    const calls = vi.fn();
    serve();
    server.use(http.post('*/api/notices/mine/m1/acknowledge', () => { calls(); return HttpResponse.json({}); }));
    renderPage(<ReadDialog id="m1" onClose={() => undefined} />);
    const acknowledge = await screen.findByRole('button', { name: 'أقرّ' });
    expect(acknowledge).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(acknowledge).toBeEnabled();
    fireEvent.click(acknowledge);
    await waitFor(() => expect(calls).toHaveBeenCalledTimes(1));
  });

  it('shows an announcement with only a «Read» button and no acknowledgement box', async () => {
    serve(mineItem({ kind: 'announcement', myState: 'info' }));
    renderPage(<ReadDialog id="m1" onClose={() => undefined} />);
    expect(await screen.findByRole('button', { name: 'قراءة' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('says an archived policy is no longer in force and offers no acknowledgement', async () => {
    serve(mineItem({ isArchived: true }));
    renderPage(<ReadDialog id="m1" onClose={() => undefined} />);
    expect(await screen.findByText('هذا التعميم لم يعد ساريًا.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'أقرّ' })).not.toBeInTheDocument();
  });
});
