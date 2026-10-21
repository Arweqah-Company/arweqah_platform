import { Injectable } from '@nestjs/common';
import type { EmailLogDto, EmailLogQuery, Paginated } from '@arweqah-platform/shared';
import { EmailLogRepository } from '../domain/email-log.repository';

@Injectable()
export class EmailLogService {
  constructor(private readonly logs: EmailLogRepository) {}

  search(query: EmailLogQuery): Promise<Paginated<EmailLogDto>> {
    return this.logs.search(query);
  }
}
