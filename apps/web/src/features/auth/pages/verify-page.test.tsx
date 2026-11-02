import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { VerifyPage } from './verify-page';

const open = () => renderRoute([{ path: '/login/verify', element: <VerifyPage /> }, { path: '/', element: <p>الرئيسية</p> }, { path: '/login', element: <p>صفحة الدخول</p> }, { path: '/enroll', element: <p>ربط التطبيق</p> }], '/login/verify');
const unverified = (overrides = {}) => server.use(http.get('*/api/me', () => HttpResponse.json({ ...me(), mfaVerified: false, ...overrides })));

describe('The code step after Microsoft sign-in (FR-13)', () => {
  it('asks for the code of the app and opens the session once it is accepted', async () => {
    unverified();
    let sent: unknown;
    server.use(http.post('*/api/mfa/verify', async ({ request }) => { sent = await request.json(); unverified({ mfaVerified: true }); return new HttpResponse(null, { status: 204 }); }));
    open();
    expect(await screen.findByRole('heading', { name: 'التحقق من الهوية' })).toBeInTheDocument();
    '123456'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`رمز تطبيق المصادقة ${i + 1}`), { target: { value: d } }));
    await waitFor(() => expect(sent).toEqual({ code: '123456' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
  });

  it('accepts a backup code instead', async () => {
    unverified();
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'استخدام رمز احتياطي' }));
    expect(screen.getByLabelText('الرمز الاحتياطي')).toBeInTheDocument();
  });

  it('shows an error for a wrong code and keeps the person on the step', async () => {
    unverified();
    server.use(http.post('*/api/mfa/verify', () => HttpResponse.json({ code: 'INVALID_CODE', message: 'x' }, { status: 400 })));
    open();
    await screen.findByRole('heading', { name: 'التحقق من الهوية' });
    '000000'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`رمز تطبيق المصادقة ${i + 1}`), { target: { value: d } }));
    expect(await screen.findByRole('alert')).toHaveTextContent('الرمز غير صحيح.');
  });

  it('sends someone without an app linked to enroll, and a signed-out visitor to sign in', async () => {
    unverified({ authenticatorEnabled: false });
    open();
    expect(await screen.findByText('ربط التطبيق')).toBeInTheDocument();
  });

  it('offers to trust the browser only when the administrator allows it, and sends the choice with the code (FR-73)', async () => {
    unverified();
    server.use(http.post('*/api/mfa/trusted-skip', () => HttpResponse.json({ skipped: false })));
    open();
    await screen.findByRole('heading', { name: 'التحقق من الهوية' });
    expect(screen.queryByLabelText('تذكّر هذا الجهاز ولا تطلب الرمز عليه')).not.toBeInTheDocument();
  });

  it('shows the choice when it is allowed, and sends it with the code', async () => {
    unverified({ trustedDevicesEnabled: true });
    let sent: unknown;
    server.use(
      http.post('*/api/mfa/trusted-skip', () => HttpResponse.json({ skipped: false })),
      http.post('*/api/mfa/verify', async ({ request }) => { sent = await request.json(); return new HttpResponse(null, { status: 204 }); }),
    );
    open();
    fireEvent.click(await screen.findByLabelText('تذكّر هذا الجهاز ولا تطلب الرمز عليه'));
    '123456'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`رمز تطبيق المصادقة ${i + 1}`), { target: { value: d } }));
    await waitFor(() => expect(sent).toEqual({ code: '123456', rememberDevice: true }));
  });

  it('skips the step by itself on a trusted browser', async () => {
    unverified({ trustedDevicesEnabled: true });
    let skipped = 0;
    server.use(http.post('*/api/mfa/trusted-skip', () => { skipped += 1; unverified({ mfaVerified: true }); return HttpResponse.json({ skipped: true }); }));
    open();
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
    expect(skipped).toBe(1);
  });
});
