import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import type { TicketRow } from '../../domain/types/ticket.types';
import { noticeFor, type NoticeKind } from '../messages/ticket.messages';

/** Sends the notices of a ticket (in the app, and by e-mail for the important ones) inside the caller's transaction. */
@Injectable()
export class TicketNotifier {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly org: OrgDirectoryService,
  ) {}

  async send(input: { kind: NoticeKind; ticket: TicketRow; recipients: string[]; email?: boolean; actorUserId?: string | null; tx?: TransactionContext; count?: number }): Promise<void> {
    const userIds = [...new Set(input.recipients)].filter((id) => id !== input.actorUserId);
    if (!userIds.length) return;
    const desk = (await this.org.describeNodes([input.ticket.deskId])).get(input.ticket.deskId);
    const notice = noticeFor(input.kind, { number: input.ticket.number, deskNameAr: desk?.nameAr ?? '', deskNameEn: desk?.nameEn ?? '', count: input.count });
    await this.notifications.notify({ userIds, ...notice, link: `/tickets/${input.ticket.id}`, channels: input.email ? ['email'] : undefined, purpose: 'tickets', tx: input.tx });
  }

  /** "N personal tickets moved to a new assignee": says how many, never which. */
  async sendCount(input: { userId: string; deskId: string; deskNameAr: string; deskNameEn: string; count: number; tx?: TransactionContext }): Promise<void> {
    const notice = noticeFor('personalMoved', { number: 0, deskNameAr: input.deskNameAr, deskNameEn: input.deskNameEn, count: input.count });
    await this.notifications.notify({ userIds: [input.userId], ...notice, link: '/tickets/setup', tx: input.tx });
  }
}
