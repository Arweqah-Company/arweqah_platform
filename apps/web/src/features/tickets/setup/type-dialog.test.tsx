import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { TypeDialog } from './type-dialog';

describe('Ticket type dialog: several handlers (FR-133)', () => {
  it('offers the people of the unit and saves every one that was ticked', async () => {
    let sent: { handlerUserIds?: string[] } = {};
    server.use(
      http.get('*/api/tickets/setup/desks/d1/assignees', () => HttpResponse.json([{ id: 'u1', name: 'سارة' }, { id: 'u2', name: 'منى' }])),
      http.post('*/api/tickets/setup/desks/d1/types', async ({ request }) => {
        sent = (await request.json()) as typeof sent;
        return HttpResponse.json({ id: 't1' }, { status: 201 });
      }),
    );
    renderPage(<TypeDialog deskId="d1" type={null} onClose={() => undefined} />);
    const [nameAr, nameEn] = await screen.findAllByRole('textbox');
    fireEvent.change(nameAr as HTMLElement, { target: { value: 'عطل الطابعة' } });
    fireEvent.change(nameEn as HTMLElement, { target: { value: 'Printer fault' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'المسؤولون' }));
    fireEvent.click(await screen.findByRole('option', { name: /سارة/ }));
    fireEvent.click(await screen.findByRole('option', { name: /منى/ }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent.handlerUserIds).toEqual(['u1', 'u2']));
  });
});
