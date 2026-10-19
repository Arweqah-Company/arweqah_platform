import type { Paginated } from '@arweqah-platform/shared';

export interface PageRequest {
  page: number;
  pageSize: number;
}

/** Contract every aggregate repository starts from. Implemented once in infrastructure. */
export abstract class BaseRepository<T extends { id: string }> {
  abstract findById(id: string): Promise<T | null>;
  abstract save(entity: T): Promise<T>;
  abstract findPaginated(page: PageRequest): Promise<Paginated<T>>;
}
