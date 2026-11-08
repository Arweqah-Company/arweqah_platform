import { Injectable } from '@nestjs/common';
import type { CareerTitleListItemDto, CareerTitlesQuery, Paginated } from '@arweqah-platform/shared';
import { CareerTitleListRepository } from '../../domain/contracts/career-title-list.repository';

/** The titles with the state of their career path (the HR page). */
@Injectable()
export class CareerTitleListService {
  constructor(private readonly list: CareerTitleListRepository) {}

  async page(query: CareerTitlesQuery): Promise<Paginated<CareerTitleListItemDto>> {
    const { items, total } = await this.list.page(query);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
