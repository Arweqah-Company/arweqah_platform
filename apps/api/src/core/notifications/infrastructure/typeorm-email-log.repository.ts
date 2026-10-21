import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import type { EmailLogDto, EmailLogQuery, EmailPurpose, Paginated } from '@arweqah-platform/shared';
import { dayRange } from '../../../common/infrastructure/date-range';
import { EmailLog } from '../domain/email-log.entity';
import { EmailLogRepository } from '../domain/email-log.repository';
import { escapeLike } from '../../../common/infrastructure/sql-like';

@Injectable()
export class TypeOrmEmailLogRepository extends EmailLogRepository {
  constructor(@InjectRepository(EmailLog) private readonly repo: Repository<EmailLog>) {
    super();
  }

  async start(entry: { to: string; subject: string; purpose: EmailPurpose }): Promise<string> {
    const saved = await this.repo.save(this.repo.create({ toEmail: entry.to, subject: entry.subject, purpose: entry.purpose, status: 'pending' }));
    return saved.id;
  }

  async markSent(id: string, receipt: { messageId: string | null; response: string | null }): Promise<void> {
    await this.repo.update(id, { status: 'sent', messageId: receipt.messageId, providerResponse: receipt.response, sentAt: new Date(), error: null });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.repo.update(id, { status: 'failed', error: error.slice(0, 1000) });
  }

  async search(query: EmailLogQuery): Promise<Paginated<EmailLogDto>> {
    const base = {
      ...(query.status && { status: query.status }),
      ...(query.purpose && { purpose: query.purpose }),
      ...(query.to && { toEmail: ILike(`%${escapeLike(query.to)}%`) }),
      ...(dayRange(query.from, query.until) && { createdAt: dayRange(query.from, query.until) }),
    };
    const term = query.search ? `%${escapeLike(query.search)}%` : null;
    // A search term matches the subject or the address; each branch keeps the other filters.
    const where = term ? [{ ...base, subject: ILike(term) }, { ...base, ...(query.to ? {} : { toEmail: ILike(term) }) }] : base;
    const [rows, total] = await this.repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize });
    return { items: rows.map(toDto), total, page: query.page, pageSize: query.pageSize };
  }
}


function toDto(row: EmailLog): EmailLogDto {
  return {
    id: row.id,
    to: row.toEmail,
    subject: row.subject,
    purpose: row.purpose,
    status: row.status,
    error: row.error,
    providerResponse: row.providerResponse,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}
