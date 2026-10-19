import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import type { NotificationsQuery, Paginated } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { Notification } from '../domain/notification.entity';
import { NotificationRepository, RecipientDirectory, type Recipient } from '../domain/notification.repository';

@Injectable()
export class TypeOrmNotificationRepository extends NotificationRepository {
  constructor(@InjectRepository(Notification) private readonly repo: Repository<Notification>) {
    super();
  }

  insertMany(rows: Omit<Notification, 'id' | 'createdAt' | 'readAt'>[], tx?: TransactionContext): Promise<Notification[]> {
    const m = managerOf(tx, this.repo.manager);
    return m.save(Notification, rows.map((r) => m.create(Notification, r)));
  }

  async listFor(userId: string, query: NotificationsQuery): Promise<Paginated<Notification>> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId, ...(query.unreadOnly ? { readAt: IsNull() } : {}) },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(userId: string, ids: string[] | 'all'): Promise<number> {
    const where = ids === 'all' ? { userId, readAt: IsNull() } : { userId, id: In(ids), readAt: IsNull() };
    const result = await this.repo.update(where, { readAt: new Date() });
    return result.affected ?? 0;
  }
}

@Injectable()
export class TypeOrmRecipientDirectory extends RecipientDirectory {
  constructor(@InjectRepository(Notification) private readonly repo: Repository<Notification>) {
    super();
  }

  async find(userId: string): Promise<Recipient | null> {
    const row = await this.repo.manager
      .createQueryBuilder()
      .select(['u.id AS id', 'u.name AS name', 'u.email AS email', 'u.phone AS phone', 'u.locale AS locale'])
      .from('users', 'u')
      .where('u.id = :userId AND u.is_active = true', { userId })
      .getRawOne<Recipient>();
    return row ?? null;
  }
}
