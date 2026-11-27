/** How long the author of a reply may change its text (the owner's decision: FR-205). */
export const TICKET_REPLY_EDIT_MINUTES = 15;

const MINUTE_MS = 60_000;

/** Is a reply still inside the minutes its author may change it in? */
export const withinReplyEditWindow = (createdAt: Date, now: Date, minutes: number = TICKET_REPLY_EDIT_MINUTES): boolean => now.getTime() - createdAt.getTime() <= minutes * MINUTE_MS;
