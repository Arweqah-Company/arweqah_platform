import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { LoginPage } from './login-page';

const open = () => renderRoute([{ path: '/login', element: <LoginPage /> }], '/login');

/** A Turnstile that shows up but waits to be solved: the test calls `answer` like a person solving it. */
function fakeTurnstile() {
  const state: { callback?: (token: string) => void; siteKey?: string } = {};
  window.turnstile = { render: (_el, options) => { state.callback = options.callback as (token: string) => void; state.siteKey = options.sitekey as string; return 'w1'; }, remove: () => undefined };
  return state;
}

afterEach(() => { delete window.turnstile; });

describe('Bot check on the sign-in page (FR-78)', () => {
  it('shows no check, and asks for none, while no provider is switched on', async () => {
    server.use(http.get('*/api/captcha/config', () => HttpResponse.json({ provider: null, siteKey: null })));
    const state = fakeTurnstile();
    open();
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
    expect(screen.getByRole('button', { name: 'متابعة' })).toBeEnabled();
    expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument();
    expect(state.siteKey).toBeUndefined();
  });

  it('shows the check with the site key, waits for the answer, and sends it with the e-mail', async () => {
    let body: unknown;
    server.use(
      http.get('*/api/captcha/config', () => HttpResponse.json({ provider: 'turnstile', siteKey: '0x4site' })),
      http.post('*/api/mfa/identify', async ({ request }) => { body = await request.json(); return HttpResponse.json({ firstTime: false }); }),
    );
    const state = fakeTurnstile();
    open();
    await screen.findByTestId('turnstile');
    await waitFor(() => expect(state.siteKey).toBe('0x4site'));
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
    expect(screen.getByRole('button', { name: 'متابعة' })).toBeDisabled();
    state.callback?.('solved');
    await waitFor(() => expect(screen.getByRole('button', { name: 'متابعة' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
    await screen.findByRole('group', { name: 'رمز تطبيق المصادقة' });
    expect(body).toEqual({ email: 'sara@arweqah.sa', captchaToken: 'solved' });
  });

  it('says the check did not pass when the server refuses it, and asks for a fresh answer', async () => {
    server.use(
      http.get('*/api/captcha/config', () => HttpResponse.json({ provider: 'turnstile', siteKey: '0x4site' })),
      http.post('*/api/mfa/identify', () => HttpResponse.json({ statusCode: 422, code: 'CAPTCHA_FAILED', message: 'x' }, { status: 422 })),
    );
    const state = fakeTurnstile();
    open();
    await waitFor(() => expect(state.callback).toBeDefined());
    fireEvent.change(screen.getByLabelText('بريد العمل'), { target: { value: 'sara@arweqah.sa' } });
    state.callback?.('used-up');
    await waitFor(() => expect(screen.getByRole('button', { name: 'متابعة' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
    expect(await screen.findByText('لم ينجح فحص الحماية، حاول مرة أخرى.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'متابعة' })).toBeDisabled());
  });
});
