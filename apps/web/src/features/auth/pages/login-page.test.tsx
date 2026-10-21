import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { LoginPage } from './login-page';

const open = () => renderRoute([{ path: '/login', element: <LoginPage /> }, { path: '/', element: <p>الرئيسية</p> }], '/login');
const identify = (firstTime: boolean) => server.use(http.post('*/api/mfa/identify', () => HttpResponse.json({ firstTime })));
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
