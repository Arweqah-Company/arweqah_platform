import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { LoginPage } from './login-page';

const open = () => renderRoute([{ path: '/login', element: <LoginPage /> }, { path: '/', element: <p>الرئيسية</p> }], '/login');
const identify = (firstTime: boolean) => server.use(http.post('*/api/mfa/identify', () => HttpResponse.json({ firstTime, trustedDevicesEnabled: true })));
const enterEmail = async () => {
  fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
  fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
  await screen.findByRole('group', { name: 'رمز تطبيق المصادقة' });
};
const fill = async (code: string) => {
  identify(false);
  await enterEmail();
  code.split('').forEach((digit, i) => fireEvent.change(screen.getByLabelText(`رمز تطبيق المصادقة ${i + 1}`), { target: { value: digit } }));
};

describe('Sign-in page (FR-01, FR-23)', () => {
  it('has no password field and no sign-up: first the work e-mail, then the app code', async () => {
    open();
    expect(screen.getByLabelText('بريد العمل')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'رمز تطبيق المصادقة' })).not.toBeInTheDocument();
    identify(false);
    await enterEmail();
    expect(screen.queryByLabelText(/كلمة المرور|password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/نسيت|تسجيل جديد|إنشاء حساب/)).not.toBeInTheDocument();
  });

  it('offers "remember this device" on the code step and sends it with the sign-in (FR-23)', async () => {
    let body: unknown;
    server.use(http.post('*/api/auth/totp/sign-in', async ({ request }) => { body = await request.json(); return HttpResponse.json({ user: { id: 'u1' } }); }));
    open();
    identify(false);
    await enterEmail();
    fireEvent.click(screen.getByRole('checkbox', { name: 'تذكّر هذا الجهاز ولا تطلب الرمز عليه' }));
    '123456'.split('').forEach((digit, i) => fireEvent.change(screen.getByLabelText(`رمز تطبيق المصادقة ${i + 1}`), { target: { value: digit } }));
    await waitFor(() => expect(body).toMatchObject({ email: 'sara@arweqah.sa', code: '123456', rememberDevice: true }));
  });

  it('tells the person while typing that the e-mail is not valid, and stops once it is', async () => {
    open();
    expect(screen.queryByText('أدخل بريدًا إلكترونيًا صحيحًا.')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@' } });
    expect(await screen.findByText('أدخل بريدًا إلكترونيًا صحيحًا.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
    await waitFor(() => expect(screen.queryByText('أدخل بريدًا إلكترونيًا صحيحًا.')).not.toBeInTheDocument());
  });

  it('signs in with the e-mail and the code as soon as the sixth digit is entered', async () => {
    let body: unknown;
    server.use(http.post('*/api/auth/totp/sign-in', async ({ request }) => { body = await request.json(); return HttpResponse.json({ user: { id: 'u1' } }); }));
    open();
    await fill('123456');
    await waitFor(() => expect(body).toEqual({ email: 'sara@arweqah.sa', code: '123456' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
  });

  it('shows one generic error for any failure and clears the code', async () => {
    server.use(http.post('*/api/auth/totp/sign-in', () => HttpResponse.json({ message: 'x' }, { status: 401 })));
    open();
    await fill('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('البريد أو الرمز غير صحيح.');
    expect((screen.getByLabelText('رمز تطبيق المصادقة 1') as HTMLInputElement).value).toBe('');
  });

  it('says to wait when the rate limit answers 429', async () => {
    server.use(http.post('*/api/auth/totp/sign-in', () => HttpResponse.json({ message: 'x' }, { status: 429 })));
    open();
    await fill('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('محاولات كثيرة');
  });
});

describe('Sign-in page: Microsoft and first sign-in (FR-16, FR-23)', () => {
  it('always shows the Microsoft button', () => {
    open();
    expect(screen.getByRole('button', { name: 'الدخول بواسطة Microsoft' })).toBeInTheDocument();
  });

  it('first time: tells the person the QR link was e-mailed, then shows the code boxes', async () => {
    identify(true);
    open();
    await enterEmail();
    expect(screen.getByText(/هذا أول دخول لك/)).toBeInTheDocument();
  });

  it('not first time: goes straight to the code boxes with no notice', async () => {
    identify(false);
    open();
    await enterEmail();
    expect(screen.queryByText(/هذا أول دخول لك/)).not.toBeInTheDocument();
  });
});

describe('Sign-in page: code by e-mail and a trusted browser (FR-164)', () => {
  const box = (label: string, code: string) => code.split('').forEach((digit, i) => fireEvent.change(screen.getByLabelText(`${label} ${i + 1}`), { target: { value: digit } }));

  it('asks for the code by e-mail on request and signs in with it as the e-mailed kind', async () => {
    let asked: unknown;
    let body: unknown;
    server.use(
      http.post('*/api/mfa/email-code', async ({ request }) => { asked = await request.json(); return new HttpResponse(null, { status: 204 }); }),
      http.post('*/api/auth/totp/sign-in', async ({ request }) => { body = await request.json(); return HttpResponse.json({ user: { id: 'u1' } }); }),
    );
    open();
    identify(false);
    await enterEmail();
    fireEvent.click(screen.getByRole('button', { name: 'أرسل الرمز إلى بريدي' }));
    expect(await screen.findByText(/أرسلنا رمزًا من 6 أرقام/)).toBeInTheDocument();
    expect(asked).toEqual({ email: 'sara@arweqah.sa' });
    expect(screen.getByRole('button', { name: /إعادة الإرسال بعد/ })).toBeDisabled();
    box('الرمز المُرسل إلى بريدك', '654321');
    await waitFor(() => expect(body).toEqual({ email: 'sara@arweqah.sa', code: '654321', method: 'email' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
  });

  it('goes back to the app code, and never offers the e-mailed code on a first sign-in', async () => {
    server.use(http.post('*/api/mfa/email-code', () => new HttpResponse(null, { status: 204 })));
    open();
    identify(false);
    await enterEmail();
    fireEvent.click(screen.getByRole('button', { name: 'أرسل الرمز إلى بريدي' }));
    fireEvent.click(await screen.findByRole('button', { name: 'استخدم رمز التطبيق' }));
    expect(screen.getByRole('group', { name: 'رمز تطبيق المصادقة' })).toBeInTheDocument();
  });

  it('does not offer the e-mailed code on a first sign-in', async () => {
    open();
    identify(true);
    await enterEmail();
    expect(screen.queryByRole('button', { name: 'أرسل الرمز إلى بريدي' })).not.toBeInTheDocument();
  });

  it('signs in with the e-mail alone on a browser the person trusted: no code step', async () => {
    server.use(http.post('*/api/auth/totp/trusted-sign-in', () => HttpResponse.json({ user: { id: 'u1' } })));
    open();
    identify(false);
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'رمز تطبيق المصادقة' })).not.toBeInTheDocument();
  });
});
