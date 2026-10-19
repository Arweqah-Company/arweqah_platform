import type { Paginated } from '@arweqah-platform/shared';
import type { ObjectLiteral, Repository } from 'typeorm';
import { BaseRepository, type PageRequest } from '../domain/base.repository';

/** Generic TypeORM implementation; module repositories extend it and add only their queries. */
export abstract class TypeOrmBaseRepository<T extends ObjectLiteral & { id: string }> extends BaseRepository<T> {
  protected constructor(protected readonly repo: Repository<T>) {
    super();
  }

  findById(id: string): Promise<T | null> {
    return this.repo.findOne({ where: { id } as never });
  }

  save(entity: T): Promise<T> {
    return this.repo.save(entity);
  }

  async findPaginated({ page, pageSize }: PageRequest): Promise<Paginated<T>> {
    const [items, total] = await this.repo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' } as never,
    });
    return { items, total, page, pageSize };
  }
}

export function toPage<T>(items: T[], total: number, page: PageRequest): Paginated<T> {
  return { items, total, page: page.page, pageSize: page.pageSize };
}
