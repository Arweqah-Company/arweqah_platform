import { CorePermission as P, type ProviderDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ProviderDialog } from './provider-dialog';

const KEYS = [P.IntegrationsTranslationView, P.IntegrationsTranslationEdit, P.IntegrationsTranslationTest, P.IntegrationsTranslationActivate];
const aws = (over: Partial<ProviderDto> = {}): ProviderDto => ({ kind: 'translation', providerKey: 'aws', status: 'tested', isActive: false, values: { accessKeyId: 'AKIA', region: 'us-east-1' }, secretsSet: ['secretAccessKey'], missing: [], invalid: [], testedAt: '2026-10-27T08:00:00Z', updatedAt: null, ...over });

function open(provider: ProviderDto, keys: string[] = KEYS) {
  server.use(http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))));
  renderPage(<ProviderDialog kind="translation" provider={provider} onClose={() => undefined} />);
}

describe('Provider dialog (FR-59)', () => {
  it('shows the saved plain data, marks the secret as saved, and allows switching on a tested service', async () => {
    open(aws());
    expect(await screen.findByLabelText('معرّف مفتاح الوصول *')).toHaveValue('AKIA');
    expect(screen.getByLabelText('المفتاح السري *')).toHaveValue('');
    expect(screen.getByText(/توجد قيمة محفوظة/)).toBeInTheDocument();
    expect(screen.getByText('نجحت التجربة بهذه البيانات. يمكنك تفعيلها.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'تفعيل' })).toBeEnabled();
  });

  it('cannot switch on a service that was not tried, and says to try it first', async () => {
    open(aws({ status: 'untested', testedAt: null }));
    await screen.findByLabelText('معرّف مفتاح الوصول *');
    expect(await screen.findByRole('button', { name: 'تفعيل' })).toBeDisabled();
    expect(screen.getByText(/جرّبها أولًا/)).toBeInTheDocument();
  });

  it('names what is missing, and cannot try or switch on until it is filled', async () => {
    open(aws({ status: 'incomplete', values: {}, secretsSet: [], missing: ['accessKeyId', 'secretAccessKey'] }));
    expect(await screen.findByText(/أكمل: معرّف مفتاح الوصول و/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'تجربة' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'تفعيل' })).toBeDisabled();
  });

  it('after an edit, asks to save first; the saved body leaves a blank secret out and sends a typed one', async () => {
    const bodies: unknown[] = [];
    server.use(http.put('*/api/integrations/translation/aws', async ({ request }) => { bodies.push(await request.json()); return HttpResponse.json(aws({ status: 'untested' })); }));
    open(aws());
    fireEvent.change(await screen.findByLabelText('المنطقة *'), { target: { value: 'eu-west-1' } });
    expect(await screen.findByRole('button', { name: 'تفعيل' })).toBeDisabled();
    expect(screen.getByText(/غيّرت البيانات/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ values: { accessKeyId: 'AKIA', region: 'eu-west-1' } });
    fireEvent.change(screen.getByLabelText('المفتاح السري *'), { target: { value: 'new-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ values: { accessKeyId: 'AKIA', region: 'eu-west-1', secretAccessKey: 'new-secret' } });
  });

  it('shows the API refusal when switching on fails', async () => {
    server.use(http.post('*/api/integrations/translation/aws/activate', () => HttpResponse.json({ statusCode: 422, code: 'PROVIDER_NOT_TESTED', message: 'x' }, { status: 422 })));
    open(aws());
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل' }));
    expect(await screen.findByText(/جرّب الخدمة ببياناتها الحالية أولًا/)).toBeInTheDocument();
  });

  it('is read-only without the edit key and shows no save or switch-on button', async () => {
    open(aws(), [P.IntegrationsTranslationView]);
    expect(await screen.findByLabelText('معرّف مفتاح الوصول *')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تفعيل' })).not.toBeInTheDocument();
  });

  it('checks values while typing: a sender that is not an address', async () => {
    open({ ...aws(), providerKey: 'sendgrid', kind: 'email', values: {}, secretsSet: [], status: 'incomplete', missing: ['apiKey', 'from'] });
    fireEvent.change(await screen.findByLabelText('المرسِل *'), { target: { value: 'nobody' } });
    expect(await screen.findByText(/اكتب عنوانًا أو/)).toBeInTheDocument();
  });
});
