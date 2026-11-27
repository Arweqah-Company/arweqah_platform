import { describe, expect, it } from 'vitest';
import { TICKET_REPLY_EDIT_MINUTES, withinReplyEditWindow } from './ticket-reply.rules';

describe('Reply edit window (FR-205)', () => {
  const sent = new Date('2026-11-27T10:00:00.000Z');
  const after = (minutes: number) => new Date(sent.getTime() + minutes * 60_000);

  it('allows 15 minutes, the last second included', () => {
    expect(TICKET_REPLY_EDIT_MINUTES).toBe(15);
    expect(withinReplyEditWindow(sent, after(0), 15)).toBe(true);
    expect(withinReplyEditWindow(sent, after(15), 15)).toBe(true);
    expect(withinReplyEditWindow(sent, new Date(after(15).getTime() + 1), 15)).toBe(false);
  });

  it('uses the constant by default', () => {
    expect(withinReplyEditWindow(sent, after(14))).toBe(true);
    expect(withinReplyEditWindow(sent, after(16))).toBe(false);
  });
});
