import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ExchangeButtons } from './exchange-buttons';

const config = { title: 'عنوان', description: 'وصف', filename: 't', columns: [], prepare: () => [] };
const buttons = (permissions: { export: string; import?: string; update?: string }) => (
  <ExchangeButtons permissions={permissions} exporting={{ columns: [], filename: 'f', pageRows: [], total: 0, loadAll: vi.fn() }} importing={config} updating={config} />
);

function open(keys: string[], permissions: { export: string; import?: string; update?: string }) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))),
  );
  renderPage(buttons(permissions));
}

describe('Import and update buttons follow their own keys (standing rule 5)', () => {
  it('shows «update from a file» only with the update key, and «import» only with the import key', async () => {
    open(['x.export', 'x.import'], { export: 'x.export', import: 'x.import', update: 'x.update' });
    expect(await screen.findByRole('button', { name: 'استيراد' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تحديث من ملف' })).not.toBeInTheDocument();
  });

  it('shows the update button without the import key when the person holds the update key', async () => {
    open(['x.export', 'x.update'], { export: 'x.export', import: 'x.import', update: 'x.update' });
    expect(await screen.findByRole('button', { name: 'تحديث من ملف' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'استيراد' })).not.toBeInTheDocument();
  });

  it('keeps one key for both when no update key is given', async () => {
    open(['x.export', 'x.import'], { export: 'x.export', import: 'x.import' });
    expect(await screen.findByRole('button', { name: 'استيراد' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تحديث من ملف' })).toBeInTheDocument();
  });
});
