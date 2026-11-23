import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { RejectDialog } from '../manage/reject-dialog';
import { listItem } from './notices-fixtures';

describe('Reject a notice needs a reason of five characters (FR-167)', () => {
  it('keeps «Reject» off and tells why until the reason has five characters, then sends it', async () => {
    const body = vi.fn();
    server.use(http.get('*/api/me', () => HttpResponse.json(me())), http.post('*/api/notices/n1/reject', async ({ request }) => { body(await request.json()); return HttpResponse.json({}); }));
    renderPage(<RejectDialog notice={listItem('n1', { status: 'pending_approval' })} onClose={() => undefined} />);
    const reason = await screen.findByLabelText(/سبب الرفض/);
    const reject = screen.getByRole('button', { name: 'رفض' });
    expect(reject).toBeDisabled();
    fireEvent.change(reason, { target: { value: 'قصير' } });
    expect(await screen.findByText('اكتب سببًا من خمسة أحرف على الأقل.')).toBeInTheDocument();
    expect(reject).toBeDisabled();
    fireEvent.change(reason, { target: { value: 'النص غير مكتمل' } });
    expect(reject).toBeEnabled();
    fireEvent.click(reject);
    await waitFor(() => expect(body).toHaveBeenCalledWith({ reason: 'النص غير مكتمل' }));
  });
});
