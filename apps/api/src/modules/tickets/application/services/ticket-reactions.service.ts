import { Injectable } from '@nestjs/common';
import type { ReactionInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ReactionsService } from '../../../../core/reactions/application/services/reactions.service';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { TicketReplyNotFoundError } from '../../domain/errors/ticket.errors';
import type { TicketRow, TicketViewer } from '../../domain/types/ticket.types';
import { TicketAccessPolicy } from '../policies/ticket-access.policy';
import { TicketReplyNotices } from './ticket-reply-notices.service';

/**
 * Reactions on the messages of a ticket: its replies and what was written when closing was asked, refused or done without execution (FR-206, FR-207, FR-219). Whoever may see the ticket and holds the key may react, also once the ticket is closed
 * (a reaction changes nothing in it). The author hears once about each new reaction, never about a change or a removal.
 */
@Injectable()
export class TicketReactionsService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly access: TicketAccessPolicy,
    private readonly reactions: ReactionsService,
    private readonly notices: TicketReplyNotices,
    private readonly tx: TransactionRunner,
  ) {}

  async react(viewer: TicketViewer, ticketId: string, eventId: string, input: ReactionInput): Promise<void> {
    const { ticket, authorUserId } = await this.target(viewer, ticketId, eventId);
    await this.tx.run(async (tx) => {
      const first = await this.reactions.set({ type: 'ticket_event', id: eventId }, viewer.userId, input.reaction, tx);
      if (first) await this.notices.sendReacted({ ticket, reactorUserId: viewer.userId, authorUserId, tx });
    });
  }

  async unreact(viewer: TicketViewer, ticketId: string, eventId: string): Promise<void> {
    await this.target(viewer, ticketId, eventId);
    await this.tx.run((tx) => this.reactions.clear({ type: 'ticket_event', id: eventId }, viewer.userId, tx));
  }

  /** The ticket (404 for somebody who may not see it) and the reply (404 when it is not a reply of this ticket). */
  private async target(viewer: TicketViewer, ticketId: string, eventId: string): Promise<{ ticket: TicketRow; authorUserId: string | null }> {
    const row = await this.tickets.find(ticketId);
    this.access.assertCanView(viewer, row);
    const reply = await this.tickets.reactableEvent(ticketId, eventId);
    if (!reply) throw new TicketReplyNotFoundError();
    return { ticket: row as TicketRow, authorUserId: reply.actorUserId };
  }
}
