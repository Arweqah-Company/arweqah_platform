import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { LoginPage } from './login-page';

const EMAIL_GROUP = 'الرمز المُرسل إلى بريدك';
const APP_GROUP = 'رمز تطبيق المصادقة';
const open = () => renderRoute([{ path: '/login', element: <LoginPage /> }, { path: '/', element: <p>الرئيسية</p> }], '/login');
const identify = (firstTime: boolean) => server.use(http.post('*/api/mfa/identify', () => HttpResponse.json({ firstTime, trustedDevicesEnabled: true })));
/** Every request for the e-mailed code is counted; the body of the last one is kept. */
let sent: unknown[] = [];
beforeEach(() => {
  sent = [];
  server.use(http.post('*/api/mfa/email-code', async ({ request }) => { sent.push(await request.json()); return new HttpResponse(null, { status: 204 }); }));
});
const typeEmail = () => {
  fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
  fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
};
/** The e-mail step of someone who has the app: the code is e-mailed by itself and its boxes show. */
const enterEmail = async () => {
  typeEmail();
  await screen.findByRole('group', { name: EMAIL_GROUP });
};
const box = (label: string, code: string) => code.split('').forEach((digit, i) => fireEvent.change(screen.getByLabelText(`${label} ${i + 1}`), { target: { value: digit } }));
/** The second choice: the code of the authenticator app. */
const chooseApp = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'استخدم رمز التطبيق' }));
  await screen.findByRole('group', { name: APP_GROUP });
};
const fillApp = async (code: string) => {
  identify(false);
  await enterEmail();
  await chooseApp();
  box(APP_GROUP, code);
};

describe('Sign-in page (FR-01, FR-23)', () => {
  it('has no password field and no sign-up: first the work e-mail, then the e-mailed code', async () => {
    open();
    expect(screen.getByLabelText('بريد العمل')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: EMAIL_GROUP })).not.toBeInTheDocument();
    identify(false);
    await enterEmail();
    expect(screen.queryByLabelText(/كلمة المرور|password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/نسيت|تسجيل جديد|إنشاء حساب/)).not.toBeInTheDocument();
  });

  it('tells the person while typing that the e-mail is not valid, and stops once it is', async () => {
    open();
    expect(screen.queryByText('أدخل بريدًا إلكترونيًا صحيحًا.')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@' } });
    expect(await screen.findByText('أدخل بريدًا إلكترونيًا صحيحًا.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
    await waitFor(() => expect(screen.queryByText('أدخل بريدًا إلكترونيًا صحيحًا.')).not.toBeInTheDocument());
  });

  it('signs in with the app code, the second choice, as soon as the sixth digit is entered', async () => {
    let body: unknown;
    server.use(http.post('*/api/auth/totp/sign-in', async ({ request }) => { body = await request.json(); return HttpResponse.json({ user: { id: 'u1' } }); }));
    open();
    identify(false);
    await enterEmail();
    fireEvent.click(screen.getByRole('checkbox', { name: 'تذكّر هذا الجهاز ولا تطلب الرمز عليه' })); // off, so the body is the bare code
    await chooseApp();
    box(APP_GROUP, '123456');
    await waitFor(() => expect(body).toEqual({ email: 'sara@arweqah.sa', code: '123456' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
  });

  it('shows one generic error for any failure and clears the code', async () => {
    server.use(http.post('*/api/auth/totp/sign-in', () => HttpResponse.json({ message: 'x' }, { status: 401 })));
    open();
    await fillApp('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('البريد أو الرمز غير صحيح.');
    expect((screen.getByLabelText(`${APP_GROUP} 1`) as HTMLInputElement).value).toBe('');
  });

  it('says to wait when the rate limit answers 429', async () => {
    server.use(http.post('*/api/auth/totp/sign-in', () => HttpResponse.json({ message: 'x' }, { status: 429 })));
    open();
    await fillApp('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('محاولات كثيرة');
  });
});

describe('Sign-in page: the code goes to the e-mail first (FR-183)', () => {
  it('e-mails the code by itself, once, as soon as the e-mail is accepted, and shows its boxes (not the app\'s)', async () => {
    open();
    identify(false);
    await enterEmail();
    expect(sent).toEqual([{ email: 'sara@arweqah.sa' }]);
    expect(screen.getByText(/أرسلنا رمزًا من 6 أرقام/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: APP_GROUP })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إعادة الإرسال بعد/ })).toBeDisabled(); // the 60 seconds before a new one
  });

  it('signs in with the e-mailed code as the e-mailed kind, with «remember this device» ticked from the start', async () => {
    let body: unknown;
    server.use(http.post('*/api/auth/totp/sign-in', async ({ request }) => { body = await request.json(); return HttpResponse.json({ user: { id: 'u1' } }); }));
    open();
    identify(false);
    await enterEmail();
    expect(screen.getByRole('checkbox', { name: 'تذكّر هذا الجهاز ولا تطلب الرمز عليه' })).toBeChecked();
    box(EMAIL_GROUP, '654321');
    await waitFor(() => expect(body).toEqual({ email: 'sara@arweqah.sa', code: '654321', rememberDevice: true, method: 'email' }));
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
  });

  it('sends no «remember» when the person unticks it', async () => {
    let body: unknown;
    server.use(http.post('*/api/auth/totp/sign-in', async ({ request }) => { body = await request.json(); return HttpResponse.json({ user: { id: 'u1' } }); }));
    open();
    identify(false);
    await enterEmail();
    fireEvent.click(screen.getByRole('checkbox', { name: 'تذكّر هذا الجهاز ولا تطلب الرمز عليه' }));
    box(EMAIL_GROUP, '654321');
    await waitFor(() => expect(body).toEqual({ email: 'sara@arweqah.sa', code: '654321', method: 'email' }));
  });

  it('keeps the app code as the second choice when the e-mail could not be sent, and says so', async () => {
    server.use(http.post('*/api/mfa/email-code', () => HttpResponse.json({ message: 'x' }, { status: 500 })));
    open();
    identify(false);
    typeEmail();
    expect(await screen.findByText('تعذّر إرسال الرمز، حاول مرة أخرى.')).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: APP_GROUP })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أرسل الرمز إلى بريدي' })).toBeInTheDocument(); // and a new try
  });

  it('goes to the app code from the e-mailed one, and the code can be sent again later', async () => {
    open();
    identify(false);
    await enterEmail();
    await chooseApp();
    fireEvent.click(screen.getByRole('button', { name: 'أرسل الرمز إلى بريدي' }));
    await screen.findByRole('group', { name: EMAIL_GROUP });
    expect(sent).toHaveLength(2);
  });

  it('signs in with the e-mail alone on a browser the person trusted: no code is sent, no code step', async () => {
    server.use(http.post('*/api/auth/totp/trusted-sign-in', () => HttpResponse.json({ user: { id: 'u1' } })));
    open();
    identify(false);
    typeEmail();
    expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });
});

describe('Sign-in page: Microsoft and the first sign-in (FR-16, FR-23, FR-183)', () => {
  it('always shows the Microsoft button', () => {
    open();
    expect(screen.getByRole('button', { name: 'الدخول بواسطة Microsoft' })).toBeInTheDocument();
  });

  it('first sign-in: the person chooses; nothing is sent until they ask, and the other way is linking the app', async () => {
    identify(true);
    open();
    typeEmail();
    expect(await screen.findByText(/هذا أول دخول لك/)).toBeInTheDocument();
    expect(screen.getByText(/لربط تطبيق المصادقة/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: EMAIL_GROUP })).not.toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it('first sign-in: «send me a code» e-mails it and shows its boxes', async () => {
    identify(true);
    open();
    typeEmail();
    fireEvent.click(await screen.findByRole('button', { name: 'أرسل الرمز إلى بريدي' }));
    expect(await screen.findByRole('group', { name: EMAIL_GROUP })).toBeInTheDocument();
    expect(sent).toEqual([{ email: 'sara@arweqah.sa' }]);
  });

  it('not a first sign-in: no first-time notice', async () => {
    identify(false);
    open();
    await enterEmail();
    expect(screen.queryByText(/هذا أول دخول لك/)).not.toBeInTheDocument();
  });
});
