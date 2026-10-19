import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const notificationsQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z.stringbool().optional(),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

export interface NotificationDto {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
