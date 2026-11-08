import type { CareerTitleListItemDto, CareerTitlesQuery } from '@arweqah-platform/shared';

export abstract class CareerTitleListRepository {
  /** One page of titles with the state of their career path, and how many titles match in all. */
  abstract page(query: CareerTitlesQuery): Promise<{ items: CareerTitleListItemDto[]; total: number }>;
}
