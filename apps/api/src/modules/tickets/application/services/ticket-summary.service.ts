import { Injectable } from '@nestjs/common';
import type { TicketSummaryDto, TicketSummaryItemDto } from '@arweqah-platform/shared';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TicketSummaryRepository, type TicketSummaryRow } from '../../domain/contracts/ticket-summary.repository';

const SHORT_LIST = 5;

/** The numbers and short lists of the home page about the person's own tickets. */
@Injectable()
export class TicketSummaryService {
  constructor(
    private readonly summaries: TicketSummaryRepository,
    private readonly org: OrgDirectoryService,
  ) {}

  async summary(userId: string): Promise<TicketSummaryDto> {
    const [counts, sent, waiting] = await Promise.all([this.summaries.counts(userId), this.summaries.sent(userId, SHORT_LIST), this.summaries.waiting(userId, SHORT_LIST)]);
    const desks = await this.org.describeNodes([...new Set([...sent, ...waiting].map((r) => r.deskId))]);
    const item = (r: TicketSummaryRow): TicketSummaryItemDto => ({
      id: r.id,
      number: Number(r.number),
      title: r.title,
      status: r.status,
      neededBy: r.neededBy,
      deskNameAr: desks.get(r.deskId)?.nameAr ?? '',
      deskNameEn: desks.get(r.deskId)?.nameEn ?? '',
      isPersonal: r.isPersonal,
    });
    return { ...counts, sent: sent.map(item), waiting: waiting.map(item) };
  }
}
