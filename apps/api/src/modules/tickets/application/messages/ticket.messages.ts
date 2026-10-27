/** Audit action names of the tickets module. Services use these constants, never inline strings. */
export const TICKET_AUDIT = {
  created: 'ticket.created',
  replied: 'ticket.replied',
  closeRequested: 'ticket.close_requested',
  closeDeclined: 'ticket.close_declined',
  confirmed: 'ticket.confirmed',
  autoClosed: 'ticket.auto_closed',
  closedNotExecuted: 'ticket.closed_not_executed',
  reopened: 'ticket.reopened',
  deskUpdated: 'ticket.desk.updated',
  typeCreated: 'ticket.type.created',
  typeUpdated: 'ticket.type.updated',
  typeRemoved: 'ticket.type.removed',
  personalReassigned: 'ticket.personal.reassigned',
} as const;

export const TICKET_TOPICS = { autoClose: 'tickets.auto-close' } as const;

export type NoticeKind = 'created' | 'reply' | 'closeRequested' | 'closedNotExecuted' | 'autoClosed' | 'reopened' | 'stale' | 'personalMoved';
