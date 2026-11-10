import { Injectable } from '@nestjs/common';
import { mentionedIn, type TicketReplyInput } from '@arweqah-platform/shared';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { TicketCommentNotAllowedError, TicketMentionInvalidError, TicketReplyTargetInvalidError } from '../../domain/errors/ticket.errors';
import type { TicketRow, TicketViewer } from '../../domain/types/ticket.types';

export interface ResolvedReply {
  parentEventId: string | null;
  replyToUserId: string | null;
  mentionIds: string[];
}

/**
 * What a reply must satisfy beyond "the person may reply": answering a reply needs its key and an existing reply of this ticket
 * (an answer to an answer is filed under the first reply and names whom it answers), and every @ needs its key, an active
 * employee of the ticket's company, and, on a personal ticket, nobody but its two sides.
 */
@Injectable()
export class TicketReplyPolicy {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly directory: TicketDirectory,
  ) {}

  async resolve(viewer: TicketViewer, ticket: TicketRow, input: TicketReplyInput): Promise<ResolvedReply> {
    const target = input.parentEventId ? await this.target(viewer, ticket, input.parentEventId) : null;
    return { parentEventId: target ? (target.parentEventId ?? target.id) : null, replyToUserId: target?.actorUserId ?? null, mentionIds: await this.mentions(viewer, ticket, input.body) };
  }

  private async target(viewer: TicketViewer, ticket: TicketRow, eventId: string) {
    if (!viewer.canAnswerReply) throw new TicketCommentNotAllowedError('answer a reply');
    const target = await this.tickets.answerableEvent(ticket.id, eventId);
    if (!target) throw new TicketReplyTargetInvalidError();
    return target;
  }

  private async mentions(viewer: TicketViewer, ticket: TicketRow, body: string): Promise<string[]> {
    const ids = mentionedIn(body);
    if (!ids.length) return [];
    if (!viewer.canMention) throw new TicketCommentNotAllowedError('mention people');
    const companies = await this.directory.companiesOf(ids);
    const sides = new Set([ticket.senderUserId, ticket.assigneeUserId]);
    if (ids.some((id) => companies.get(id) !== ticket.deskCompanyId || (ticket.isPersonal && !sides.has(id)))) throw new TicketMentionInvalidError();
    return ids;
  }
}
