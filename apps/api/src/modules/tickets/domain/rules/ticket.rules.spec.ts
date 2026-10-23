import { addWorkingDays } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { deskUnavailableReason, isNewTicket, isOverdue, isStale } from './ticket-flags.rules';
import { abilitiesFor, nextState, reopenDaysLeft } from './ticket-lifecycle.rules';
import { earliestNeededBy, resolveNeededBy } from './working-days.rules';

const at = (iso: string) => new Date(iso);

describe('Ticket lifecycle rules (FR-39)', () => {
  it('moves between statuses only along the allowed paths', () => {
    expect(nextState('request_close', 'open')).toEqual({ status: 'close_requested', closeReason: null });
    expect(nextState('confirm_close', 'close_requested')).toEqual({ status: 'closed', closeReason: 'confirmed' });
    expect(nextState('auto_close', 'close_requested')).toEqual({ status: 'closed', closeReason: 'auto' });
    expect(nextState('close_without_execution', 'open')).toEqual({ status: 'closed', closeReason: 'not_executed' });
    expect(nextState('close_without_execution', 'close_requested')).toEqual({ status: 'closed', closeReason: 'not_executed' });
    expect(nextState('decline_close', 'close_requested')).toEqual({ status: 'open', closeReason: null });
    expect(nextState('sender_reply', 'close_requested')).toEqual({ status: 'open', closeReason: null });
    expect(nextState('reopen', 'closed')).toEqual({ status: 'open', closeReason: null });
    for (const [action, status] of [['request_close', 'closed'], ['confirm_close', 'open'], ['auto_close', 'open'], ['reopen', 'open'], ['decline_close', 'closed'], ['close_without_execution', 'closed']] as const) {
      expect(nextState(action, status), `${action} from ${status}`).toBeNull();
    }
  });

  it('counts the days left to reopen, rounded up, and none once the time is over', () => {
    const closedAt = at('2026-10-20T10:00:00Z');
    expect(reopenDaysLeft('closed', closedAt, 7, at('2026-10-20T10:00:00Z'))).toBe(7);
    expect(reopenDaysLeft('closed', closedAt, 7, at('2026-10-26T12:00:00Z'))).toBe(1);
    expect(reopenDaysLeft('closed', closedAt, 7, at('2026-10-27T10:00:00Z'))).toBeNull();
    expect(reopenDaysLeft('open', null, 7, at('2026-10-20T10:00:00Z'))).toBeNull();
  });

  it('gives each relation only what it may do', () => {
    expect(abilitiesFor(['sender'], 'open', null)).toEqual({ reply: true, requestClose: false, closeWithoutExecution: false, confirmClose: false, declineClose: false, reopen: false });
    expect(abilitiesFor(['assignee'], 'open', null)).toMatchObject({ reply: true, requestClose: true, closeWithoutExecution: true, confirmClose: false });
    expect(abilitiesFor(['manager'], 'close_requested', null)).toMatchObject({ requestClose: false, closeWithoutExecution: true });
    expect(abilitiesFor(['sender'], 'close_requested', null)).toMatchObject({ confirmClose: true, declineClose: true, reply: true });
    expect(abilitiesFor(['sender'], 'closed', 3)).toMatchObject({ reopen: true, reply: false });
    expect(abilitiesFor(['sender'], 'closed', null).reopen).toBe(false);
    expect(abilitiesFor(['assignee', 'manager'], 'closed', 3)).toMatchObject({ reply: false, reopen: false });
  });
});

describe('Ticket flags and desk availability (FR-37, FR-38)', () => {
  it('is overdue once the needed-by day has passed, until closed', () => {
    expect(isOverdue('2026-10-20', 'open', '2026-10-21')).toBe(true);
    expect(isOverdue('2026-10-21', 'open', '2026-10-21')).toBe(false);
    expect(isOverdue('2026-10-01', 'closed', '2026-10-21')).toBe(false);
  });

  it('is stale after the quiet period, only while open', () => {
    expect(isStale('open', at('2026-10-01T00:00:00Z'), 14, at('2026-10-15T00:00:00Z'))).toBe(true);
    expect(isStale('open', at('2026-10-02T00:00:00Z'), 14, at('2026-10-15T00:00:00Z'))).toBe(false);
    expect(isStale('close_requested', at('2026-09-01T00:00:00Z'), 14, at('2026-10-15T00:00:00Z'))).toBe(false);
  });

  it('is new until the unit answers', () => {
    expect(isNewTicket(null, 'open')).toBe(true);
    expect(isNewTicket(at('2026-10-01T00:00:00Z'), 'open')).toBe(false);
    expect(isNewTicket(null, 'closed')).toBe(false);
  });

  it('says why a desk cannot take tickets, in a fixed order', () => {
    const base = { receptionStatus: 'active' as const, startDate: '2026-01-01', hasManager: true };
    expect(deskUnavailableReason(base, '2026-10-21')).toBeNull();
    expect(deskUnavailableReason({ ...base, receptionStatus: 'stopped' }, '2026-10-21')).toBe('stopped');
    expect(deskUnavailableReason({ ...base, receptionStatus: 'paused' }, '2026-10-21')).toBe('paused');
    expect(deskUnavailableReason({ ...base, startDate: '2026-12-01' }, '2026-10-21')).toBe('not_started');
    expect(deskUnavailableReason({ ...base, hasManager: false }, '2026-10-21')).toBe('no_manager');
    expect(deskUnavailableReason({ ...base, receptionStatus: 'paused', hasManager: false }, '2026-10-21')).toBe('paused');
  });
});

describe('Needed-by date in working days (FR-37)', () => {
  it('skips Friday and Saturday', () => {
    expect(addWorkingDays('2026-10-22', 3)).toBe('2026-10-27');
    expect(addWorkingDays('2026-10-23', 1)).toBe('2026-10-25');
    expect(addWorkingDays('2026-10-24', 0)).toBe('2026-10-24');
    expect(addWorkingDays('2026-10-25', 4)).toBe('2026-10-29');
    expect(addWorkingDays('2026-10-25', 5)).toBe('2026-11-01');
  });

  it('suggests today plus the duration, accepts a chosen date not earlier than the lead, and refuses earlier ones', () => {
    const base = { today: '2026-10-22', typeDueDays: null, deskDueDays: 3, minLeadDays: 2 };
    expect(resolveNeededBy({ ...base, chosen: undefined })).toBe('2026-10-27');
    expect(resolveNeededBy({ ...base, typeDueDays: 1, chosen: undefined })).toBe('2026-10-25');
    expect(earliestNeededBy('2026-10-22', 2)).toBe('2026-10-26');
    expect(resolveNeededBy({ ...base, chosen: '2026-10-26' })).toBe('2026-10-26');
    expect(resolveNeededBy({ ...base, chosen: '2026-10-25' })).toBeNull();
  });
});
