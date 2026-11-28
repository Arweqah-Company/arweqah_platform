import { CorePermission as P, TICKET_STATUSES, type TicketStatus } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { moveAction, moveTargets } from './ticket-moves';

const ticket = (status: TicketStatus) => ({ status, sender: { id: 'sender', name: 'المرسل' } });
const SENDER = 'sender';
const UNIT = 'unit';

describe('The moves of the tickets board (FR-227)', () => {
  it('lets the unit ask to close an open ticket, or close it without execution, and nothing else', () => {
    expect(moveAction(ticket('open'), 'close_requested', UNIT)).toBe('request-close');
    expect(moveAction(ticket('open'), 'closed', UNIT)).toBe('close-without-execution');
    expect(moveAction(ticket('open'), 'open', UNIT)).toBeNull();
    expect(moveAction(ticket('close_requested'), 'open', UNIT)).toBeNull();
    expect(moveAction(ticket('closed'), 'open', UNIT)).toBeNull();
  });

  it('lets the sender confirm, decline or reopen; for a waiting ticket the unit still closes without execution', () => {
    expect(moveAction(ticket('close_requested'), 'closed', SENDER)).toBe('confirm-close');
    expect(moveAction(ticket('close_requested'), 'closed', UNIT)).toBe('close-without-execution');
    expect(moveAction(ticket('close_requested'), 'open', SENDER)).toBe('decline-close');
    expect(moveAction(ticket('closed'), 'open', SENDER)).toBe('reopen');
  });

  it('never leads a ticket back to «waiting for confirmation» or from closed to anything but open', () => {
    expect(moveAction(ticket('closed'), 'close_requested', SENDER)).toBeNull();
    expect(moveAction(ticket('close_requested'), 'close_requested', SENDER)).toBeNull();
    expect(moveAction(ticket('closed'), 'closed', SENDER)).toBeNull();
  });

  it('offers only the statuses whose action the person holds the key for', () => {
    const all = () => true;
    const onlyClosing = (key: string) => key === P.TicketsCloseWithoutExecution;
    expect(moveTargets(ticket('open'), TICKET_STATUSES, UNIT, all)).toEqual(['close_requested', 'closed']);
    expect(moveTargets(ticket('open'), TICKET_STATUSES, UNIT, onlyClosing)).toEqual(['closed']);
    expect(moveTargets(ticket('open'), TICKET_STATUSES, UNIT, () => false)).toEqual([]);
    expect(moveTargets(ticket('close_requested'), TICKET_STATUSES, SENDER, all)).toEqual(['open', 'closed']);
    expect(moveTargets(ticket('closed'), TICKET_STATUSES, undefined, all)).toEqual([]);
  });
});
