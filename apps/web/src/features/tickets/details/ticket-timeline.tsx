import { CorePermission, type TicketDto, type TicketEventDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { ReplyBox } from './reply-box';
import { Entry } from './ticket-entry';

/** What belongs to the conversation: the replies, and the message that came with a step (closing requested, declined, closed, reopened). The ticket's own text (`created`) is shown above, the steps without a message only in the history. */
const inConversation = (e: TicketEventDto) => e.type === 'reply' || (e.type !== 'created' && Boolean(e.body));

/** The conversation, oldest first; the answers to a reply sit under it. Every step, with or without a message, is also in the history (`TicketHistory`). */
export function TicketTimeline({ ticket }: { ticket: TicketDto }) {
  const { t } = useTranslation('tickets');
  const mayAnswer = usePermissions().can(CorePermission.TicketsCommentReply) && ticket.abilities.reply;
  const [answering, setAnswering] = useState<string | null>(null);
  const answersOf = (id: string) => ticket.events.filter((e) => e.parentId === id);
  return (
    <section aria-label={t('timeline.heading')} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-muted">{t('timeline.heading')}</h2>
      <ol className="flex flex-col gap-3">
        {ticket.events.filter((e) => inConversation(e) && !e.parentId).map((e) => (
          <li key={e.id} className="flex flex-col gap-2">
            <Entry ticketId={ticket.id} event={e} canAnswer={mayAnswer && e.type === 'reply'} onAnswer={() => setAnswering(e.id)} />
            {(answersOf(e.id).length > 0 || answering === e.id) && (
              <ol className="ms-6 flex flex-col gap-2 border-s-2 border-petrol-50 ps-3">
                {answersOf(e.id).map((a) => <li key={a.id}><Entry ticketId={ticket.id} event={a} nested canAnswer={mayAnswer} onAnswer={() => setAnswering(e.id)} /></li>)}
                {answering === e.id && <li><ReplyBox ticketId={ticket.id} answering={e} onDone={() => setAnswering(null)} /></li>}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
