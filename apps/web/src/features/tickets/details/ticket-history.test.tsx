import type { TicketDto, TicketEventDto } from '@arweqah-platform/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../../../test/render';
import { TicketHistory } from './ticket-history';
import { TicketTimeline } from './ticket-timeline';

const event = (over: Partial<TicketEventDto>): TicketEventDto => ({ id: 'e', type: 'created', actor: { id: 'u1', name: 'ساره مجدى' }, body: null, parentId: null, replyTo: null, mentions: [], attachments: [], createdAt: '2026-11-17T19:00:00.000Z', ...over });
const ticket = (events: TicketEventDto[]): TicketDto => ({ id: 't1', number: 12, title: 'طلب جهاز', abilities: { reply: true }, events } as unknown as TicketDto);

const steps = [
  event({ id: 'e1' }),
  event({ id: 'e2', type: 'reassigned', replyTo: { id: 'u2', name: 'أحمد الزهراني' } }),
  event({ id: 'e3', type: 'close_declined', body: 'ررر' }),
  event({ id: 'e4', type: 'closed_not_executed', body: 'يي' }),
  event({ id: 'e5', type: 'reopened', body: 'نت' }),
  event({ id: 'e6', type: 'reply', body: 'جاري العمل' }),
];

describe('Ticket history as a table (FR-160)', () => {
  it('counts the steps that are not replies and opens them in a table only when asked', async () => {
    renderPage(<TicketHistory ticket={ticket(steps)} />);
    expect(screen.getByText('عدد الخطوات: 5')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'عرض السجل' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('draws a numbered row per step with who, the event and its details: the person a ticket was handed to, and the message that came with a decline, a closing and a reopening', async () => {
    renderPage(<TicketHistory ticket={ticket(steps)} />);
    fireEvent.click(screen.getByRole('button', { name: 'عرض السجل' }));
    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
    expect(within(rows[1]!).getByText('أعاد إسناد التذكرة')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('إلى أحمد الزهراني')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('رفض المرسل الإغلاق')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('ررر')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('أُغلقت دون تنفيذ')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('أُعيد فتحها')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('نت')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('ساره مجدى')).toBeInTheDocument();
  });

  it('keeps the steps out of the conversation: the timeline shows the replies only', async () => {
    renderPage(<TicketTimeline ticket={ticket(steps)} />);
    expect(await screen.findByText('جاري العمل')).toBeInTheDocument();
    for (const text of ['أعاد إسناد التذكرة', 'رفض المرسل الإغلاق', 'أُغلقت دون تنفيذ', 'أُعيد فتحها']) expect(screen.queryByText(text)).not.toBeInTheDocument();
  });
});
