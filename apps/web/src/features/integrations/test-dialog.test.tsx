import { CorePermission as P, type ProviderDto } from '@arweqah-platform/shared';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ProviderDialog } from './provider-dialog';
import { TestDialog } from './test-dialog';

const SLOW = { timeout: 4000 };

describe('Translation try-out popup (FR-59)', () => {
  it('translates the Arabic typed in the first box after a pause and shows it in the English box', async () => {
    const sent: unknown[] = [];
    server.use(http.post('*/api/integrations/translation/aws/test', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json({ ok: true, message: null, text: 'Hello' }); }));
    renderPage(<TestDialog kind="translation" providerKey="aws" providerName="Amazon Translate" onClose={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('العربية'), { target: { value: 'مرحبا' } });
    expect(await screen.findByDisplayValue('Hello', {}, SLOW)).toBeInTheDocument();
    expect(sent).toEqual([{ text: 'مرحبا' }]);
    expect(screen.getByText('تعمل الخدمة: وصل منها رد.')).toBeInTheDocument();
  });

  it('shows the problem the service reported and leaves the English box empty', async () => {
    server.use(http.post('*/api/integrations/translation/aws/test', () => HttpResponse.json({ ok: false, message: 'The security token is invalid', text: null })));
    renderPage(<TestDialog kind="translation" providerKey="aws" providerName="Amazon Translate" onClose={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('العربية'), { target: { value: 'مرحبا' } });
    expect(await screen.findByText('The security token is invalid', {}, SLOW)).toBeInTheDocument();
    expect(screen.getByLabelText('الإنجليزية')).toHaveValue('');
  });

  it('shows the API refusal (for example incomplete data)', async () => {
    server.use(http.post('*/api/integrations/translation/aws/test', () => HttpResponse.json({ statusCode: 422, code: 'PROVIDER_INCOMPLETE', message: 'x' }, { status: 422 })));
    renderPage(<TestDialog kind="translation" providerKey="aws" providerName="Amazon Translate" onClose={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('العربية'), { target: { value: 'مرحبا' } });
    expect(await screen.findByText(/بيانات الخدمة ناقصة/, {}, SLOW)).toBeInTheDocument();
  });

  it('sends what is in the form, not only what was saved', async () => {
    const sent: { values?: unknown }[] = [];
    server.use(http.post('*/api/integrations/translation/aws/test', async ({ request }) => { sent.push((await request.json()) as { values?: unknown }); return HttpResponse.json({ ok: true, message: null, text: 'Hi' }); }));
    renderPage(<TestDialog kind="translation" providerKey="aws" providerName="Amazon Translate" values={{ accessKeyId: 'AKIA', region: 'eu-west-1' }} onClose={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('العربية'), { target: { value: 'مرحبا' } });
    await screen.findByDisplayValue('Hi', {}, SLOW);
    expect(sent[0]?.values).toEqual({ accessKeyId: 'AKIA', region: 'eu-west-1' });
  });
});

describe('E-mail try-out popup (FR-60)', () => {
  const provider: ProviderDto = { kind: 'email', providerKey: 'sendgrid', status: 'untested', isActive: false, values: { from: 'Arweqah <no-reply@arweqah.sa>' }, secretsSet: ['apiKey'], missing: [], invalid: [], testedAt: null, updatedAt: null };

  function open() {
    server.use(http.get('*/api/me', () => HttpResponse.json(me([P.IntegrationsEmailView, P.IntegrationsEmailTest].map((key) => ({ key, scope: 'all' as const }))))));
    renderPage(<ProviderDialog kind="email" provider={provider} onClose={() => undefined} />);
  }

  it('sends a test message to any address and says it was accepted', async () => {
    const sent: unknown[] = [];
    server.use(http.post('*/api/integrations/email/sendgrid/test', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json({ ok: true, message: 'SendGrid answered 202', text: null }); }));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'تجربة' }));
    const to = await screen.findByLabelText('إرسال إلى');
    expect(screen.getByRole('button', { name: 'إرسال رسالة تجريبية' })).toBeDisabled();
    fireEvent.change(to, { target: { value: 'someone@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال رسالة تجريبية' }));
    expect(await screen.findByText(/قبلت الخدمة الرسالة إلى someone@example.com/)).toBeInTheDocument();
    expect(sent).toEqual([{ to: 'someone@example.com' }]);
  });

  it('shows the provider\'s error when the message is refused', async () => {
    server.use(http.post('*/api/integrations/email/sendgrid/test', () => HttpResponse.json({ ok: false, message: 'The from address does not match a verified Sender Identity', text: null })));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'تجربة' }));
    fireEvent.change(await screen.findByLabelText('إرسال إلى'), { target: { value: 'someone@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال رسالة تجريبية' }));
    expect(await screen.findByText(/does not match a verified Sender Identity/)).toBeInTheDocument();
  });

  it('refuses an address that is not valid before sending', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'تجربة' }));
    fireEvent.change(await screen.findByLabelText('إرسال إلى'), { target: { value: 'nobody' } });
    expect(await screen.findByText('أدخل بريدًا إلكترونيًا صحيحًا.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إرسال رسالة تجريبية' })).toBeDisabled();
  });
});

describe('Bot protection try-out popup (FR-78)', () => {
  it('shows the real check with the site key and sends its answer with the keys in the form', async () => {
    const sent: unknown[] = [];
    window.turnstile = { render: (_el, options) => { (options.callback as (token: string) => void)('solved'); return 'w1'; }, remove: () => undefined };
    server.use(http.post('*/api/integrations/captcha/turnstile/test', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json({ ok: true, message: null, text: null }); }));
    renderPage(<TestDialog kind="captcha" providerKey="turnstile" providerName="Cloudflare Turnstile" values={{ siteKey: '0x4site', secretKey: 'secret-1234' }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تحقق من الإجابة' }));
    expect(await screen.findByText('نجحت التجربة: المفتاحان من الأداة نفسها.')).toBeInTheDocument();
    expect(sent).toEqual([{ values: { siteKey: '0x4site', secretKey: 'secret-1234' }, captchaToken: 'solved' }]);
    delete window.turnstile;
  });

  it('shows what Cloudflare said when the keys do not match', async () => {
    window.turnstile = { render: (_el, options) => { (options.callback as (token: string) => void)('solved'); return 'w1'; }, remove: () => undefined };
    server.use(http.post('*/api/integrations/captcha/turnstile/test', () => HttpResponse.json({ ok: false, message: 'Cloudflare rejected the answer', text: null })));
    renderPage(<TestDialog kind="captcha" providerKey="turnstile" providerName="Cloudflare Turnstile" values={{ siteKey: '0x4site' }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تحقق من الإجابة' }));
    expect(await screen.findByText('Cloudflare rejected the answer')).toBeInTheDocument();
    delete window.turnstile;
  });
});

describe('AI service try-out popup (FR-126)', () => {
  it('sends one short request with the key and model in the form and says the key is accepted', async () => {
    const sent: unknown[] = [];
    server.use(http.post('*/api/integrations/ai/anthropic/test', async ({ request }) => { sent.push(await request.json()); return HttpResponse.json({ ok: true, message: null, text: null }); }));
    renderPage(<TestDialog kind="ai" providerKey="anthropic" providerName="أنثروبيك (Claude)" values={{ apiKey: 'sk-ant-key-1234', model: 'claude-opus-5-5' }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'شغّل التجربة' }));
    expect(await screen.findByText('نجحت التجربة: المفتاح والنموذج مقبولان.')).toBeInTheDocument();
    expect(sent).toEqual([{ values: { apiKey: 'sk-ant-key-1234', model: 'claude-opus-5-5' } }]);
  });

  it('shows what the service said when it refuses the key', async () => {
    server.use(http.post('*/api/integrations/ai/anthropic/test', () => HttpResponse.json({ ok: false, message: '401: invalid x-api-key', text: null })));
    renderPage(<TestDialog kind="ai" providerKey="anthropic" providerName="أنثروبيك (Claude)" onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'شغّل التجربة' }));
    expect(await screen.findByText('401: invalid x-api-key')).toBeInTheDocument();
  });
});
