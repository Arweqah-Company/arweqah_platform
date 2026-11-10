import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import type { TicketRow } from '../../domain/types/ticket.types';
import { formatTicketNumber } from '@arweqah-platform/shared';
import { TemplateRenderer } from '../../../../core/templates/application/services/template-renderer';
import type { NoticeKind } from '../messages/ticket.messages';
import { TICKET_TEMPLATE_KEYS } from '../messages/ticket-templates';

/** Sends the notices of a ticket (in the app, and by e-mail for the important ones) inside the caller's transaction. */
@Injectable()
export class TicketNotifier {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly org: OrgDirectoryService,
    private readonly templates: TemplateRenderer,
  ) {}

  async send(input: { kind: NoticeKind; ticket: TicketRow; recipients: string[]; email?: boolean; actorUserId?: string | null; tx?: TransactionContext; count?: number; commenter?: string }): Promise<void> {
    const userIds = [...new Set(input.recipients)].filter((id) => id !== input.actorUserId);
    if (!userIds.length) return;
    const desk = (await this.org.describeNodes([input.ticket.deskId])).get(input.ticket.deskId);
    const notice = await this.notice(input.kind, input.ticket.number, desk, { count: input.count, commenter: input.commenter });
    await this.notifications.notify({ userIds, ...notice, link: `/tickets/${input.ticket.id}`, channels: input.email ? ['email'] : undefined, purpose: 'tickets', tx: input.tx });
  }

  /** "N personal tickets moved to a new assignee": says how many, never which. */
  async sendCount(input: { userId: string; deskId: string; deskNameAr: string; deskNameEn: string; count: number; tx?: TransactionContext }): Promise<void> {
    const notice = await this.notice('personalMoved', 0, { nameAr: input.deskNameAr, nameEn: input.deskNameEn }, { count: input.count });
    await this.notifications.notify({ userIds: [input.userId], ...notice, link: '/tickets/setup', tx: input.tx });
  }

  /** The wording of a notice: the live template (the administrator's or the default) filled with the ticket number and the department. */
  private notice(kind: NoticeKind, number: number | string, desk: { nameAr: string; nameEn: string } | undefined, extra: { count?: number; commenter?: string } = {}) {
    const values = { ticketNumber: formatTicketNumber(number), count: String(extra.count ?? 0), commenter: extra.commenter ?? '' };
    return this.templates.renderNotice(TICKET_TEMPLATE_KEYS[kind], values, { ar: { deskName: desk?.nameAr ?? '' }, en: { deskName: desk?.nameEn ?? '' } });
  }
}
