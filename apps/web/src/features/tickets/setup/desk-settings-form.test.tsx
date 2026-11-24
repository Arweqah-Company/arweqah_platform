import { CorePermission, type TicketDeskDto } from '@arweqah-platform/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { chooseOption } from '../../../../test/select';
import { DeskSettingsForm } from './desk-settings-form';

const desk = (manager: TicketDeskDto['manager']) => ({
  orgNodeId: 'd1', parentId: null, manager,
  settings: { receptionStatus: 'paused', acceptsPersonal: false, descriptionAr: null, descriptionEn: null, defaultDueDays: 3, minLeadDays: 1, autoCloseDays: 7, reopenWindowDays: 7, staleAfterDays: 3 },
  types: [],
}) as unknown as TicketDeskDto;

function open(keys: string[], manager: TicketDeskDto['manager']) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))),
  );
  renderPage(<DeskSettingsForm desk={desk(manager)} />);
}

describe('A unit without a manager cannot be activated, and the way to give it one is on the page (FR-180)', () => {
  it('links the unit to the leaders tab of the structure, beside the refusal, for who may open the structure', async () => {
    open([CorePermission.TicketsSetupEdit, CorePermission.OrgView], null);
    await chooseOption(await screen.findByRole('combobox'), 'active');
    expect(screen.getByText('لا تُفعَّل جهة بلا مدير.')).toBeInTheDocument();
    expect((await screen.findByRole('link', { name: 'تعيين مدير الجهة من الهيكل التنظيمي' })).getAttribute('href')).toBe('/org?unit=d1&tab=leaders');
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
  });

  it('shows no link to someone who cannot open the structure', async () => {
    open([CorePermission.TicketsSetupEdit], null);
    await screen.findByRole('combobox');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no link when the unit already has a manager, and activation is allowed', async () => {
    open([CorePermission.TicketsSetupEdit, CorePermission.OrgView], { id: 'u1', name: 'سارة' });
    await chooseOption(await screen.findByRole('combobox'), 'active');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('لا تُفعَّل جهة بلا مدير.')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeEnabled();
  });
});
