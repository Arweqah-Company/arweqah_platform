import type { AdminModeDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { AdminModeToggle } from './admin-mode-toggle';

const OFF: AdminModeDto = { available: true, active: false, expiresAt: null };
const ON: AdminModeDto = { available: true, active: true, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() };

/** The session as the server would report it: a switch the tests can flip. */
function serve(state: { adminMode: AdminModeDto }, activate: (code: string) => Response | Promise<Response>) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json({ ...me(), adminMode: state.adminMode })),
    http.post('*/api/admin-mode/activate', async ({ request }) => activate(((await request.json()) as { code: string }).code)),
    http.post('*/api/admin-mode/deactivate', () => {
      state.adminMode = OFF;
      return new HttpResponse(null, { status: 204 });
    }),
  );
}
const open = () => renderRoute([{ path: '/', element: <AdminModeToggle /> }], '/');
const type = (code: string) => code.split('').forEach((digit, i) => fireEvent.change(screen.getByLabelText(`رمز تطبيق المصادقة ${i + 1}`), { target: { value: digit } }));
const error = (status: number, code: string) => HttpResponse.json({ statusCode: status, code, message: code }, { status });

describe('Platform admin mode switch (FR-34)', () => {
  it('is not shown to someone who has no administrative capability', async () => {
    serve({ adminMode: { available: false, active: false, expiresAt: null } }, () => error(403, 'ADMIN_MODE_NOT_ALLOWED'));
    open();
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });

  it('asks for a code, turns on when it is accepted, and turns off with one click', async () => {
    const state = { adminMode: OFF };
    serve(state, () => {
      state.adminMode = ON;
      return HttpResponse.json(ON);
    });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل وضع مدير المنصة' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    type('123456');
    const on = await screen.findByRole('button', { name: 'إيقاف وضع مدير المنصة' });
    expect(on).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(on);
    expect(await screen.findByRole('button', { name: 'تفعيل وضع مدير المنصة' })).toHaveAttribute('aria-pressed', 'false');
  });

  it.each([
    ['INVALID_CODE', 400, 'الرمز غير صحيح'],
    ['CODE_ALREADY_USED', 422, 'استُخدم من قبل'],
    ['AUTHENTICATOR_LOCKED', 400, 'محاولات كثيرة'],
  ])('says what went wrong for %s and keeps it off', async (code, status, text) => {
    serve({ adminMode: OFF }, () => error(status, code));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل وضع مدير المنصة' }));
    await screen.findByRole('dialog');
    type('123456');
    expect(await screen.findByText((content) => content.includes(text))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إيقاف وضع مدير المنصة' })).not.toBeInTheDocument();
  });
});
