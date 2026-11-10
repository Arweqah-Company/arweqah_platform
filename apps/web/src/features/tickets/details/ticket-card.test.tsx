import type { TicketDto } from '@arweqah-platform/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { TicketCard } from './ticket-card';
import { TicketTimeline } from './ticket-timeline';

const ticket = {
  id: 't1', number: 12, title: 'الطابعة', details: 'الطابعة لا تعمل منذ الصباح', status: 'open', closeReason: null, priority: 1, overdue: false, stale: false, isNew: true, isPersonal: false,
  deskNameAr: 'تقنية المعلومات', deskNameEn: 'IT', typeNameAr: 'مشكلة', typeNameEn: 'Problem', sender: { id: 'u1', name: 'منى' }, assignee: null, neededBy: '2026-11-20', createdAt: '2026-11-10T08:00:00.000Z', abilities: { reply: true },
  events: [
    { id: 'e0', type: 'created', actor: { id: 'u1', name: 'منى' }, body: 'الطابعة لا تعمل منذ الصباح', parentId: null, replyTo: null, mentions: [], attachments: [{ fileId: 'f1', originalName: 'shot.png', contentType: 'image/png', size: 4 }], createdAt: '2026-11-10T08:00:00.000Z' },
    { id: 'e1', type: 'reply', actor: { id: 'u2', name: 'علي' }, body: 'جاري الفحص', parentId: null, replyTo: null, mentions: [], attachments: [], createdAt: '2026-11-10T09:00:00.000Z' },
  ],
} as unknown as TicketDto;

describe('The ticket card stands apart from the conversation (FR-128)', () => {
  it('shows the number, the text, the files and the facts in the card, and only the replies in the conversation', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me())));
    renderPage(<><TicketCard ticket={ticket} /><TicketTimeline ticket={ticket} /></>);
    const card = screen.getByRole('region', { name: 'التذكرة' });
    expect(within(card).getByText('TKT-000012')).toBeInTheDocument();
    expect(within(card).getByText('الطابعة لا تعمل منذ الصباح')).toHaveClass('text-base');
    expect(within(card).getByRole('button', { name: 'عرض shot.png' })).toBeInTheDocument();
    expect(within(card).getByText('تقنية المعلومات')).toBeInTheDocument();
    const conversation = screen.getByRole('region', { name: 'سجل التذكرة' });
    expect(within(conversation).getByText('جاري الفحص')).toBeInTheDocument();
    expect(within(conversation).queryByText('الطابعة لا تعمل منذ الصباح')).not.toBeInTheDocument();
  });
});
