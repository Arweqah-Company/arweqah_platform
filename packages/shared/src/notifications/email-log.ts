import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';

export const EMAIL_STATUSES = ['pending', 'sent', 'failed'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/** Why an e-mail was sent (the category the log is filtered by); keeps the log readable without storing the message body. */
export const EMAIL_PURPOSES = ['activation', 'tickets', 'tasks', 'notification', 'test', 'other'] as const;
export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export const emailLogQuerySchema = paginationQuerySchema.extend({
  status: z.enum(EMAIL_STATUSES).optional(),
  purpose: z.enum(EMAIL_PURPOSES).optional(),
  to: z.string().trim().max(254).optional(),
  from: z.iso.date().optional(),
  until: z.iso.date().optional(),
});
export type EmailLogQuery = z.infer<typeof emailLogQuerySchema>;

export interface EmailLogDto {
  id: string;
  to: string;
  subject: string;
  purpose: EmailPurpose;
  status: EmailStatus;
  /** Why delivery failed, as reported by the mail server. */
  error: string | null;
  /** The mail server's acknowledgement (accepted by the server, not necessarily read). */
  providerResponse: string | null;
  createdAt: string;
  sentAt: string | null;
}
