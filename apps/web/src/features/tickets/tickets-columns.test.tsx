import type { TicketListItemDto } from '@arweqah-platform/shared';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTicketExportColumns } from './tickets-columns';

const ticket = { id: 't1', number: 5, title: 'الطابعة', status: 'open', closeReason: null, priority: 0, neededBy: '2026-12-01', deskNameAr: 'الدعم', deskNameEn: 'Support', typeNameAr: 'مشكلة', typeNameEn: 'Problem', sender: { id: 'u', name: 'سارة' }, assignee: null, createdAt: '2026-11-26T21:30:00.000Z', lastActivityAt: '2026-11-26T22:10:00.000Z', details: 'نص' } as unknown as TicketListItemDto;

describe('The ticket export file writes dates like the screens (FR-184, FR-187)', () => {
  it('gives the day in Riyadh for the send date and the last activity, the same one the list shows', () => {
    const { result } = renderHook(() => useTicketExportColumns());
    const value = (id: string) => result.current.find((c) => c.id === id)?.value(ticket);
    expect(value('createdAt')).toBe('2026-11-27'); // 00:30 in Riyadh, not the UTC day
    expect(value('activity')).toBe('2026-11-27');
    expect(value('neededBy')).toBe('2026-12-01');
    expect(value('details')).toBe('نص');
  });
});
