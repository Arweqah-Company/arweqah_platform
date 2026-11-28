/** A ticket row of the list, as the API sends it (the sender is the signed-in test person `u1` unless said otherwise). */
export const ticketItem = (id: string, number: number, status: string, over: Record<string, unknown> = {}) => ({
  id, number, title: `تذكرة ${number}`, status, closeReason: null, priority: 0, neededBy: '2026-11-01', isPersonal: false,
  deskId: 'd1', deskNameAr: 'الدعم', deskNameEn: 'Support', typeId: 't1', typeNameAr: 'عطل', typeNameEn: 'Fault',
  sender: { id: 'u1', name: 'سارة' }, assignee: null, createdAt: '2026-10-01', lastActivityAt: '2026-10-01', overdue: false, stale: false, isNew: true,
  ...over,
});
