import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { VerifyPage } from './verify-page';

const open = () => renderRoute([{ path: '/login/verify', element: <VerifyPage /> }, { path: '/', element: <p>الرئيسية</p> }, { path: '/login', element: <p>صفحة الدخول</p> }, { path: '/enroll', element: <p>ربط التطبيق</p> }], '/login/verify');
const unverified = (overrides = {}) => server.use(http.get('*/api/me', () => HttpResponse.json({ ...me(), mfaVerified: false, ...overrides })));

const EMAIL_GROUP = 'الرمز المُرسل إلى بريدك';
const APP_GROUP = 'رمز تطبيق المصادقة';
/** Every request to e-mail the code to the signed-in person is counted. */
let asked = 0;
beforeEach(() => {
  asked = 0;
  server.use(http.post('*/api/mfa/email-code/me', () => { asked += 1; return new HttpResponse(null, { status: 204 }); }));
});
const box = (label: string, code: string) => code.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`${label} ${i + 1}`), { target: { value: d } }));
/** The second choice: the code of the authenticator app. */
const chooseApp = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'استخدم رمز التطبيق' }));
  await screen.findByRole('group', { name: APP_GROUP });
};

describe('The code step after Microsoft sign-in (FR-13, FR-183)', () => {
  it('e-mails the code by itself, once, and asks for it; the session opens once it is accepted as the e-mailed kind', async () => {
    unverified();
    let sent: unknown;
    server.use(http.post('*/api/mfa/verify', async ({ request }) => { sent = await request.json(); unverified({ mfaVerified: true }); return new HttpResponse(null, { status: 204 }); }));
    open();
    expect(await screen.findByRole('heading', { name: 'التحقق من الهوية' })).toBeInTheDocument();
    expect(await screen.findByText(/أرسلنا رمزًا من 6 أرقام/)).toBeInTheDocument();
    expect(asked).toBe(1);
    expect(screen.queryByRole('group', { name: APP_GROUP })).not.toBeInTheDocument();
    box(EMAIL_GROUP, '246810');
    await waitFor(() => expect(sent).toEqual({ code: '246810', method: 'email' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
    expect(asked).toBe(1);
  });

  it('keeps the app code as the second choice', async () => {
    unverified();
    let sent: unknown;
    server.use(http.post('*/api/mfa/verify', async ({ request }) => { sent = await request.json(); unverified({ mfaVerified: true }); return new HttpResponse(null, { status: 204 }); }));
    open();
    await chooseApp();
    box(APP_GROUP, '123456');
    await waitFor(() => expect(sent).toEqual({ code: '123456' }));
  });

  it('accepts a backup code under the app code', async () => {
    unverified();
    open();
    await chooseApp();
    fireEvent.click(screen.getByRole('button', { name: 'استخدام رمز احتياطي' }));
    expect(screen.getByLabelText('الرمز الاحتياطي')).toBeInTheDocument();
  });

  it('keeps the app code available and says so when the e-mail could not be sent', async () => {
    unverified();
    server.use(http.post('*/api/mfa/email-code/me', () => HttpResponse.json({ message: 'x' }, { status: 500 })));
    open();
    expect(await screen.findByText('تعذّر إرسال الرمز، حاول مرة أخرى.')).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: APP_GROUP })).toBeInTheDocument();
  });

  it('can send the code again (after its wait) from the e-mailed step', async () => {
    unverified();
    open();
    await screen.findByText(/أرسلنا رمزًا من 6 أرقام/);
    expect(screen.getByRole('button', { name: /إعادة الإرسال بعد/ })).toBeDisabled();
  });

  it('shows an error for a wrong code and keeps the person on the step', async () => {
    unverified();
    server.use(http.post('*/api/mfa/verify', () => HttpResponse.json({ code: 'INVALID_CODE', message: 'x' }, { status: 400 })));
    open();
    await screen.findByRole('group', { name: EMAIL_GROUP });
    box(EMAIL_GROUP, '000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('الرمز غير صحيح.');
  });

  it('sends a signed-out visitor to sign in', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'x' }, { status: 401 })));
    open();
    expect(await screen.findByText('صفحة الدخول')).toBeInTheDocument();
  });

  it('offers to trust the browser only when the administrator allows it', async () => {
    unverified();
    server.use(http.post('*/api/mfa/trusted-skip', () => HttpResponse.json({ skipped: false })));
    open();
    await screen.findByRole('group', { name: EMAIL_GROUP });
    expect(screen.queryByLabelText('تذكّر هذا الجهاز ولا تطلب الرمز عليه')).not.toBeInTheDocument();
  });

  it('shows «remember this device» ticked from the start when it is allowed, and sends it with the code', async () => {
    unverified({ trustedDevicesEnabled: true });
    let sent: unknown;
    server.use(
      http.post('*/api/mfa/trusted-skip', () => HttpResponse.json({ skipped: false })),
      http.post('*/api/mfa/verify', async ({ request }) => { sent = await request.json(); return new HttpResponse(null, { status: 204 }); }),
    );
    open();
    expect(await screen.findByLabelText('تذكّر هذا الجهاز ولا تطلب الرمز عليه')).toBeChecked();
    await screen.findByRole('group', { name: EMAIL_GROUP });
    box(EMAIL_GROUP, '123456');
    await waitFor(() => expect(sent).toEqual({ code: '123456', rememberDevice: true, method: 'email' }));
  });

  it('shows the choice above the code boxes: the code submits by itself at the sixth digit, so a box below it could never be ticked in time (FR-73)', async () => {
    unverified({ trustedDevicesEnabled: true });
    server.use(http.post('*/api/mfa/trusted-skip', () => HttpResponse.json({ skipped: false })));
    open();
    const choice = await screen.findByLabelText('تذكّر هذا الجهاز ولا تطلب الرمز عليه');
    const firstBox = await screen.findByLabelText(`${EMAIL_GROUP} 1`);
    expect(choice.compareDocumentPosition(firstBox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('skips the step by itself on a trusted browser, and e-mails no code', async () => {
    unverified({ trustedDevicesEnabled: true });
    let skipped = 0;
    server.use(http.post('*/api/mfa/trusted-skip', () => { skipped += 1; unverified({ mfaVerified: true }); return HttpResponse.json({ skipped: true }); }));
    open();
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
    expect(skipped).toBe(1);
    expect(asked).toBe(0);
  });

  it('waits for the trusted-browser check before e-mailing the code, then e-mails it only if the step was not skipped', async () => {
    unverified({ trustedDevicesEnabled: true });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.post('*/api/mfa/trusted-skip', async () => { await gate; return HttpResponse.json({ skipped: false }); }));
    open();
    await screen.findByRole('heading', { name: 'التحقق من الهوية' });
    expect(asked).toBe(0);
    release();
    await screen.findByRole('group', { name: EMAIL_GROUP });
    expect(asked).toBe(1);
  });
});

describe('First sign-in, no app linked yet (FR-164, FR-183)', () => {
  it('lets the person choose: link the app, or e-mail a code; nothing is sent until they ask', async () => {
    unverified({ authenticatorEnabled: false });
    let sent: unknown;
    server.use(http.post('*/api/mfa/verify', async ({ request }) => { sent = await request.json(); unverified({ authenticatorEnabled: false, mfaVerified: true }); return new HttpResponse(null, { status: 204 }); }));
    open();
    expect(await screen.findByRole('link', { name: 'ربط تطبيق المصادقة' })).toHaveAttribute('href', '/enroll');
    expect(asked).toBe(0);
    expect(screen.queryByRole('group', { name: APP_GROUP })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'أرسل الرمز إلى بريدي' }));
    await screen.findByLabelText(`${EMAIL_GROUP} 1`);
    expect(asked).toBe(1);
    box(EMAIL_GROUP, '123456');
    await waitFor(() => expect(sent).toEqual({ code: '123456', method: 'email' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
  });
});
