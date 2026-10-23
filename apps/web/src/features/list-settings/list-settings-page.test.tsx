import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ListSettingsPage } from './list-settings-page';

describe('List management page (FR-44)', () => {
  it('shows what a list offers, locks its first column, and saves what was unchecked', async () => {
    const saved: unknown[] = [];
    server.use(
      http.get('*/api/me', () => HttpResponse.json({ ...me(), adminMode: { available: true, active: true, expiresAt: null } })),
      http.put('*/api/list-settings/employees', async ({ request }) => {
        saved.push(await request.json());
        return HttpResponse.json({ hiddenColumns: ['company'], hiddenFilters: [] });
      }),
    );
    renderPage(<ListSettingsPage />);
    const company = (await screen.findAllByRole('checkbox', { name: 'الشركة' }))[0] as HTMLElement; // the column (the filter has the same name)
    expect(screen.getAllByRole('checkbox', { name: 'رقم الموظف' })[0]).toBeDisabled();
    const save = screen.getByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled();
    fireEvent.click(company);
    fireEvent.click(save);
    await waitFor(() => expect(saved).toEqual([{ hiddenColumns: ['company'], hiddenFilters: [] }]));
  });
});
