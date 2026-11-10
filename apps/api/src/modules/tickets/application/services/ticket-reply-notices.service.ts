import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import type { TicketRow } from '../../domain/types/ticket.types';
import type { NoticeKind } from '../messages/ticket.messages';
import type { ResolvedReply } from '../policies/ticket-reply.policy';
import { TicketNotifier } from './ticket-notifier.service';

export interface PostedReply extends ResolvedReply {
  ticket: TicketRow;
  actorUserId: string;
  /** The people the ordinary "new reply" notice goes to. */
  audience: string[];
}

/**
 * Who hears about a reply, each person once and by the strongest reason: the people it mentions (also by e-mail, without the text),
 * whoever it answers, then the usual audience of a reply. Nobody is told of their own reply.
 */
@Injectable()
export class TicketReplyNotices {
  constructor(
    private readonly notifier: TicketNotifier,
    private readonly directory: TicketDirectory,
  ) {}

  async send(reply: PostedReply, tx: TransactionContext): Promise<void> {
    const commenter = (await this.directory.people([reply.actorUserId])).get(reply.actorUserId)?.name ?? '';
    const told = new Set<string>([reply.actorUserId]);
    const take = (ids: (string | null)[]): string[] => {
      const fresh = [...new Set(ids.filter((id): id is string => !!id && !told.has(id)))];
      fresh.forEach((id) => told.add(id));
      return fresh;
    };
    const groups: [NoticeKind, string[], boolean][] = [
      ['mentioned', take(reply.mentionIds), true],
      ['replyAnswered', take([reply.replyToUserId]), false],
      ['reply', take(reply.audience), false],
    ];
    for (const [kind, recipients, email] of groups) await this.notifier.send({ kind, ticket: reply.ticket, recipients, email, commenter, actorUserId: reply.actorUserId, tx });
  }
}
