import { CorePermission as P, type IntegrationCatalogDto, type ProviderDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage, renderRoute } from '../../../test/render';
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
