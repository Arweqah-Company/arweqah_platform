import type { TicketDto } from '@arweqah-platform/shared';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { TicketActions } from './ticket-actions';

const ticket = (chooseHandler: boolean) => ({ id: 't1', number: 12, title: 'الطابعة', relations: [], handlers: [{ id: 'u1', name: 'سارة أحمد' }, { id: 'u2', name: 'خالد علي' }], abilities: { reply: false, requestClose: false, closeWithoutExecution: false, confirmClose: false, declineClose: false, reopen: false, reassign: false, chooseHandler, delete: false }, reopenDaysLeft: null }) as unknown as TicketDto;

function open(keys: string[], allowed: boolean) {
  server.use(http.get('*/api/me', () => HttpResponse.json(me())), http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))));
  renderRoute([{ path: '/tickets/t1', element: <TicketActions ticket={ticket(allowed)} /> }], '/tickets/t1');
}

describe('The «Choose handler» button on a ticket (FR-179)', () => {
  it('opens the dialog for who holds the key when the API allows it', async () => {
    open(['tickets.choose_handler'], true);
    fireEvent.click(await screen.findByRole('button', { name: 'تحديد مسؤول' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('is absent without the key, and absent when the API does not allow it', async () => {
    open(['tickets.reassign'], true);
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByRole('button', { name: 'تحديد مسؤول' })).not.toBeInTheDocument();
  });

  it('is absent when the API does not allow it, even with the key', async () => {
    open(['tickets.choose_handler'], false);
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByRole('button', { name: 'تحديد مسؤول' })).not.toBeInTheDocument();
  });
});
