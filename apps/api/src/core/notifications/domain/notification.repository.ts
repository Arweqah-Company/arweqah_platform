import type { NotificationsQuery, Paginated } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/domain/transaction-context';
import type { Notification } from './notification.entity';

export abstract class NotificationRepository {
  abstract insertMany(rows: Omit<Notification, 'id' | 'createdAt' | 'readAt'>[], tx?: TransactionContext): Promise<Notification[]>;
  abstract listFor(userId: string, query: NotificationsQuery): Promise<Paginated<Notification>>;
  abstract unreadCount(userId: string): Promise<number>;
  /** Marks read only rows owned by the user; returns how many changed. */
  abstract markRead(userId: string, ids: string[] | 'all'): Promise<number>;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  locale: 'ar' | 'en';
}

/** Contact details of users, read from the users table. */
export abstract class RecipientDirectory {
  abstract find(userId: string): Promise<Recipient | null>;
}
