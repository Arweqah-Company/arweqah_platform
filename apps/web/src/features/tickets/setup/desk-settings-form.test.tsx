import { CorePermission, type TicketDeskDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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

describe('A unit without a manager cannot be activated, and the way to give it one is on the page (FR-182)', () => {
  it('disables «Active» up front and says why, instead of refusing after the choice', async () => {
    open([CorePermission.TicketsSetupEdit], null);
    const trigger = await screen.findByRole('combobox');
    expect(await screen.findByText(/غير متاح الآن: لا مدير لهذه الجهة/)).toBeInTheDocument();
    fireEvent.click(trigger);
    const active = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('[cmdk-item]')).find((el) => (el.getAttribute('data-value') ?? '').endsWith(' active'));
      if (!found) throw new Error('no option');
      return found;
    });
    expect(active).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(active);
    expect(screen.queryByText('لا تُفعَّل جهة بلا مدير.')).not.toBeInTheDocument(); // nothing was chosen, so no error
    expect(trigger).toHaveTextContent('متوقف مؤقتًا');
  });

  it('links the unit to its leaders tab with the form open, in a new page, for who may assign leaders', async () => {
    open([CorePermission.TicketsSetupEdit, CorePermission.OrgLeadersManage], null);
    const link = await screen.findByRole('link', { name: /تعيين مدير الجهة من الهيكل التنظيمي/ });
    expect(link.getAttribute('href')).toBe('/org?unit=d1&tab=leaders&assign=leader');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('shows no link to someone who cannot assign leaders, even if they can open the structure', async () => {
    open([CorePermission.TicketsSetupEdit, CorePermission.OrgView], null);
    await screen.findByRole('combobox');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps «Active» available, with no link and no warning, when the unit has a manager', async () => {
    open([CorePermission.TicketsSetupEdit, CorePermission.OrgLeadersManage], { id: 'u1', name: 'سارة' });
    await chooseOption(await screen.findByRole('combobox'), 'active');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/غير متاح الآن/)).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeEnabled();
  });
});
