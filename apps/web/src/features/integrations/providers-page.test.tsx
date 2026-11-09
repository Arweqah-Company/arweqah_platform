import { CorePermission as P, type IntegrationCatalogDto, type ProviderDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage, renderRoute } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { ProvidersPage } from './providers-page';
import { SettingsPage } from './settings-page';

const provider = (over: Partial<ProviderDto>): ProviderDto => ({ kind: 'translation', providerKey: 'aws', status: 'incomplete', isActive: false, values: {}, secretsSet: [], missing: ['accessKeyId'], invalid: [], testedAt: null, updatedAt: null, ...over });
const catalog = (providers: ProviderDto[], usingServerSettings = false): IntegrationCatalogDto => ({ kind: 'translation', providers, usingServerSettings });
const ALL = [P.IntegrationsTranslationView, P.IntegrationsTranslationEdit, P.IntegrationsTranslationTest, P.IntegrationsTranslationActivate, P.IntegrationsTranslationExport];

function serve(data: IntegrationCatalogDto, keys: string[] = ALL, kind = 'translation') {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get(`*/api/integrations/${kind}`, () => HttpResponse.json(data)),
  );
}

const PROVIDERS = [
  provider({ providerKey: 'aws', status: 'tested', isActive: true, missing: [], testedAt: '2026-10-27T08:00:00Z' }),
  provider({ providerKey: 'google', status: 'untested', missing: [] }),
  provider({ providerKey: 'azure', status: 'incomplete' }),
];

describe('Translation settings page (FR-59)', () => {
  it('lists every service with its status and which one is in use', async () => {
    serve(catalog(PROVIDERS));
    renderPage(<ProvidersPage kind="translation" />);
    expect(await screen.findByText('ترجمة جوجل كلاود (Google Cloud Translation)')).toBeInTheDocument();
    expect(screen.getByText('تمت تجربتها', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('لم تُجرَّب', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('البيانات ناقصة', { selector: 'span' })).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Amazon Translate/ })).getByText('قيد الاستخدام')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Azure/ })).getByText('غير مستخدمة')).toBeInTheDocument();
  });

  it('offers to switch on only a tested service, to try only one with complete data, and to switch off the one in use', async () => {
    serve(catalog([PROVIDERS[1]!, provider({ providerKey: 'aws', status: 'tested', missing: [] }), PROVIDERS[2]!]));
    renderPage(<ProvidersPage kind="translation" />);
    await screen.findByText('ترجمة جوجل كلاود (Google Cloud Translation)');
    expect(await screen.findAllByRole('button', { name: 'تفعيل' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'تجربة' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'إيقاف' })).not.toBeInTheDocument();
  });

  it('switches a tested service on from its row', async () => {
    let active = false;
    const now = () => catalog([provider({ providerKey: 'aws', status: 'tested', isActive: active, missing: [] })]);
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me(ALL.map((key) => ({ key, scope: 'all' as const }))))),
      http.get('*/api/integrations/translation', () => HttpResponse.json(now())),
      http.post('*/api/integrations/translation/aws/activate', () => { active = true; return HttpResponse.json(now()); }),
    );
    renderPage(<ProvidersPage kind="translation" />);
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل' }));
    expect(await screen.findByRole('button', { name: 'إيقاف' })).toBeInTheDocument();
    expect(active).toBe(true);
  });

  it('hides the buttons its keys do not allow', async () => {
    serve(catalog(PROVIDERS), [P.IntegrationsTranslationView]);
    renderPage(<ProvidersPage kind="translation" />);
    await screen.findByText('ترجمة جوجل كلاود (Google Cloud Translation)');
    for (const name of ['تفعيل', 'تجربة', 'إيقاف']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('says the server settings are used when nothing is switched on', async () => {
    serve(catalog([PROVIDERS[2]!], true));
    renderPage(<ProvidersPage kind="translation" />);
    expect(await screen.findByText(/تُستخدم إعدادات الخادم/)).toBeInTheDocument();
  });

  it('narrows the list by search and by status', async () => {
    serve(catalog(PROVIDERS));
    renderPage(<ProvidersPage kind="translation" />);
    await screen.findByText('ترجمة جوجل كلاود (Google Cloud Translation)');
    fireEvent.change(screen.getByLabelText('بحث في الخدمات'), { target: { value: 'azure' } });
    expect(await screen.findByText('مترجم أزور (Azure AI Translator)')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('ترجمة جوجل كلاود (Google Cloud Translation)')).not.toBeInTheDocument());
  });

  it('shows an error state when the list cannot be loaded', async () => {
    server.use(http.get('*/api/integrations/translation', () => HttpResponse.json({ message: 'x' }, { status: 500 })));
    renderPage(<ProvidersPage kind="translation" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('Service guide (FR-62)', () => {
  it('opens, from the row, the steps to get the keys and the meaning of every value', async () => {
    serve(catalog(PROVIDERS));
    renderPage(<ProvidersPage kind="translation" />);
    const row = await screen.findByRole('row', { name: /Amazon Translate/ });
    expect(within(row).getByText(/خدمة الترجمة من أمازون/)).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'كيف أحصل على البيانات' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('الخطوات')).toBeInTheDocument();
    expect(within(dialog).getByText('معنى كل قيمة')).toBeInTheDocument();
    expect(within(dialog).getByText(/السرّ يظهر مرة واحدة فقط/)).toBeInTheDocument();
    expect(within(dialog).getAllByRole('term')).toHaveLength(3);
  });
});

describe('E-mail settings page (FR-60)', () => {
  it('lists the e-mail services with their own title', async () => {
    serve({ kind: 'email', usingServerSettings: false, providers: [provider({ kind: 'email', providerKey: 'sendgrid' }), provider({ kind: 'email', providerKey: 'smtp' })] }, [P.IntegrationsEmailView], 'email');
    renderRoute([{ path: '/service-settings', element: <SettingsPage /> }], '/service-settings?tab=email');
    expect(await screen.findByText('SendGrid')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'الإعدادات' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'البريد الإلكتروني', selected: true })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'الترجمة' })).not.toBeInTheDocument();
  });

  it('shows a tab for each service the person may view and switches between them', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me([P.IntegrationsTranslationView, P.IntegrationsEmailView].map((key) => ({ key, scope: 'all' as const }))))),
      http.get('*/api/integrations/translation', () => HttpResponse.json(catalog(PROVIDERS))),
      http.get('*/api/integrations/email', () => HttpResponse.json({ kind: 'email', usingServerSettings: false, providers: [provider({ kind: 'email', providerKey: 'sendgrid' })] })),
    );
    renderRoute([{ path: '/service-settings', element: <SettingsPage /> }], '/service-settings');
    expect(await screen.findByText('ترجمة جوجل كلاود (Google Cloud Translation)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'البريد الإلكتروني' }));
    expect(await screen.findByText('SendGrid')).toBeInTheDocument();
  });
});

describe('AI service settings page (FR-126)', () => {
  const AI_KEYS = [P.IntegrationsAiView, P.IntegrationsAiEdit, P.IntegrationsAiTest, P.IntegrationsAiActivate, P.IntegrationsAiExport];
  const anthropic = provider({ kind: 'ai', providerKey: 'anthropic', status: 'untested', missing: [], values: { model: 'claude-opus-5-5' }, secretsSet: ['apiKey'] });

  it('lists the one service with its status, and says no AI button is offered while none is switched on', async () => {
    serve({ kind: 'ai', providers: [anthropic], usingServerSettings: false }, AI_KEYS, 'ai');
    renderPage(<ProvidersPage kind="ai" />);
    expect(await screen.findByRole('row', { name: /أنثروبيك \(Claude\)/ })).toBeInTheDocument();
    expect(screen.getByText('لم تُجرَّب', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/خدمة الذكاء الاصطناعي التي ترتّب أجزاء ملف المسمى/)).toBeInTheDocument();
  });

  it('opens the guide to get the key: numbered steps, the meaning of the key and the model, and the privacy note', async () => {
    serve({ kind: 'ai', providers: [anthropic], usingServerSettings: false }, AI_KEYS, 'ai');
    renderPage(<ProvidersPage kind="ai" />);
    const row = await screen.findByRole('row', { name: /أنثروبيك \(Claude\)/ });
    fireEvent.click(within(row).getByRole('button', { name: 'كيف أحصل على البيانات' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/console\.anthropic\.com/)).toBeInTheDocument();
    expect(within(dialog).getAllByRole('term')).toHaveLength(2);
    expect(within(dialog).getByText(/يُرسل إلى Anthropic/)).toBeInTheDocument();
  });

  it('shows the form with the key as a secret and the model with its hint', async () => {
    serve({ kind: 'ai', providers: [anthropic], usingServerSettings: false }, AI_KEYS, 'ai');
    renderPage(<ProvidersPage kind="ai" />);
    const row = await screen.findByRole('row', { name: /أنثروبيك \(Claude\)/ });
    fireEvent.click(within(row).getByRole('button', { name: 'تعديل' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/مفتاح API/)).toHaveAttribute('type', 'password');
    expect(within(dialog).getByLabelText(/النموذج/)).toHaveValue('claude-opus-5-5');
  });
});

describe('The free AI service next to Claude (FR-126)', () => {
  const AI_KEYS = [P.IntegrationsAiView, P.IntegrationsAiEdit, P.IntegrationsAiTest, P.IntegrationsAiActivate, P.IntegrationsAiExport];
  const free = provider({ kind: 'ai', providerKey: 'compatible', status: 'incomplete', missing: ['apiKey'], values: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' } });
  const claude = provider({ kind: 'ai', providerKey: 'anthropic', status: 'tested', isActive: true, missing: [], values: { model: 'claude-opus-5-5' }, secretsSet: ['apiKey'] });

  it('lists both services and says which one is in use', async () => {
    serve({ kind: 'ai', providers: [claude, free], usingServerSettings: false }, AI_KEYS, 'ai');
    renderPage(<ProvidersPage kind="ai" />);
    expect(within(await screen.findByRole('row', { name: /أنثروبيك/ })).getByText('قيد الاستخدام')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /متوافقة مع OpenAI/ })).getByText('غير مستخدمة')).toBeInTheDocument();
  });

  it('shows the address and the model already filled with the free Gemini, and the key as a secret', async () => {
    serve({ kind: 'ai', providers: [claude, free], usingServerSettings: false }, AI_KEYS, 'ai');
    renderPage(<ProvidersPage kind="ai" />);
    fireEvent.click(within(await screen.findByRole('row', { name: /متوافقة مع OpenAI/ })).getByRole('button', { name: 'تعديل' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/مفتاح API/)).toHaveAttribute('type', 'password');
    expect(within(dialog).getByLabelText(/عنوان الخدمة/)).toHaveValue('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(within(dialog).getByLabelText(/النموذج/)).toHaveValue('gemini-3.8-flash');
  });

  it('opens its guide: the free Gemini steps, the three fields and the privacy note', async () => {
    serve({ kind: 'ai', providers: [claude, free], usingServerSettings: false }, AI_KEYS, 'ai');
    renderPage(<ProvidersPage kind="ai" />);
    fireEvent.click(within(await screen.findByRole('row', { name: /متوافقة مع OpenAI/ })).getByRole('button', { name: 'كيف أحصل على البيانات' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/aistudio\.google\.com/)).toBeInTheDocument();
    expect(within(dialog).getAllByRole('term')).toHaveLength(3);
    expect(within(dialog).getByText(/قد تستخدم ما ترسلينه لتحسين منتجاتها/)).toBeInTheDocument();
  });
});

describe('The pick list of models (FR-126)', () => {
  const AI_KEYS = [P.IntegrationsAiView, P.IntegrationsAiEdit, P.IntegrationsAiTest, P.IntegrationsAiActivate];
  const free = provider({ kind: 'ai', providerKey: 'compatible', status: 'incomplete', missing: [], values: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' }, secretsSet: ['apiKey'] });

  async function openForm(keys: string[] = AI_KEYS, answer: { status?: number; body: unknown } = { body: { ok: true, models: ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'], message: null } }) {
    const asked: unknown[] = [];
    serve({ kind: 'ai', providers: [free], usingServerSettings: false }, keys, 'ai');
    server.use(http.post('*/api/integrations/ai/compatible/models', async ({ request }) => { asked.push(await request.json()); return HttpResponse.json(answer.body as object, { status: answer.status ?? 200 }); }));
    renderPage(<ProvidersPage kind="ai" />);
    fireEvent.click(within(await screen.findByRole('row', { name: /متوافقة مع OpenAI/ })).getByRole('button', { name: 'تعديل' }));
    return { asked, dialog: await screen.findByRole('dialog') };
  }

  it('is a text box until the service is asked, then a pick list of the models it offers, sent with the form\'s data', async () => {
    const { asked, dialog } = await openForm();
    expect(within(dialog).getByLabelText(/النموذج/)).toHaveValue('gemini-3.8-flash');
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعرض النماذج المتاحة' }));
    expect(await within(dialog).findByText('النماذج المتاحة: 3')).toBeInTheDocument();
    expect(asked).toEqual([{ values: expect.objectContaining({ baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' }) }]);
    expect(within(dialog).getByRole('combobox', { name: 'النموذج' })).toHaveTextContent('gemini-3.8-flash');
    expect(within(dialog).getByRole('button', { name: 'حدّث القائمة' })).toBeInTheDocument();
  });

  it('FR-126 (review): drops the list when the key or the address changes, so a model of the old service cannot be picked', async () => {
    const { dialog } = await openForm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعرض النماذج المتاحة' }));
    await within(dialog).findByText('النماذج المتاحة: 3');
    fireEvent.change(within(dialog).getByLabelText(/عنوان الخدمة/), { target: { value: 'https://api.groq.com/openai/v1' } });
    await waitFor(() => expect(within(dialog).queryByText('النماذج المتاحة: 3')).not.toBeInTheDocument());
    expect(within(dialog).getByLabelText(/النموذج/)).toHaveValue('gemini-3.8-flash');
    expect(within(dialog).getByRole('button', { name: 'اعرض النماذج المتاحة' })).toBeInTheDocument();
  });

  it('keeps the list when only the model is picked (it is not a reason to ask again)', async () => {
    const { dialog } = await openForm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعرض النماذج المتاحة' }));
    await within(dialog).findByText('النماذج المتاحة: 3');
    await chooseOption(within(dialog).getByRole('combobox', { name: 'النموذج' }), 'gemini-3.6-flash');
    expect(within(dialog).getByText('النماذج المتاحة: 3')).toBeInTheDocument();
  });

  it('puts the chosen model in the form, ready to be saved', async () => {
    const { dialog } = await openForm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعرض النماذج المتاحة' }));
    await within(dialog).findByText('النماذج المتاحة: 3');
    await chooseOption(within(dialog).getByRole('combobox', { name: 'النموذج' }), 'gemini-3.5-flash-lite');
    expect(within(dialog).getByRole('combobox', { name: 'النموذج' })).toHaveTextContent('gemini-3.5-flash-lite');
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeEnabled();
  });

  it('says why the models could not be listed and keeps the text box, so the name can still be typed', async () => {
    const { dialog } = await openForm(AI_KEYS, { body: { ok: false, models: [], message: '400: API key not valid' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعرض النماذج المتاحة' }));
    expect(await within(dialog).findByText('400: API key not valid')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/النموذج/)).toHaveValue('gemini-3.8-flash');
    fireEvent.change(within(dialog).getByLabelText(/النموذج/), { target: { value: 'my-model' } });
    expect(within(dialog).getByLabelText(/النموذج/)).toHaveValue('my-model');
  });

  it('shows the API refusal (for example a missing key) in words', async () => {
    const { dialog } = await openForm(AI_KEYS, { status: 422, body: { statusCode: 422, code: 'PROVIDER_INCOMPLETE', message: 'x' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعرض النماذج المتاحة' }));
    expect(await within(dialog).findByText(/بيانات الخدمة ناقصة/)).toBeInTheDocument();
  });

  it('offers the list only to who may try the service', async () => {
    const { dialog } = await openForm(AI_KEYS.filter((k) => k !== P.IntegrationsAiTest));
    expect(within(dialog).getByLabelText(/النموذج/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'اعرض النماذج المتاحة' })).not.toBeInTheDocument();
  });
});
