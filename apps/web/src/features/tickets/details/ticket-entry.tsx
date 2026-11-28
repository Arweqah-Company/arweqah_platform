import { formatDateTime } from '@/shared/lib/format-date';
import { CorePermission, isReactableEvent, type ReactionKey, type TicketEventDto } from '@arweqah-platform/shared';
import { MessageSquareReply, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/cn';
import { errorMessage } from '@/shared/lib/error-message';
import { MentionedText, ReactionBar, RowAction } from '@/shared/ui';
import { useReactToReply, useUnreactToReply } from '../api';
import { TicketFiles } from './ticket-files';
import { ReplyEditor } from './ticket-reply-editor';

interface EntryProps {
  ticketId: string;
  event: TicketEventDto;
  /** Show «Reply» on this entry (it is a reply, the ticket takes replies and the person holds the key). */
  canAnswer: boolean;
  onAnswer?: () => void;
  nested?: boolean;
}

/** The reactions under a reply: the chips and the picker; a refusal shows as a message. */
function Reactions({ ticketId, event }: { ticketId: string; event: TicketEventDto }) {
  const { t: tc } = useTranslation();
  const react = useReactToReply(ticketId);
  const unreact = useUnreactToReply(ticketId);
  const fail = (error: unknown) => toast.error(errorMessage(tc, error));
  return <div className="mt-2"><ReactionBar reactions={event.reactions} permission={CorePermission.TicketsReplyReact} onReact={(reaction: ReactionKey) => react.mutate({ eventId: event.id, reaction }, { onError: fail })} onRemove={() => unreact.mutate(event.id, { onError: fail })} /></div>;
}

/** Who, what and when of an entry, with the «edited» mark and the edit and answer buttons of a reply. */
function EntryHeader({ event, canAnswer, onAnswer, onEdit }: { event: TicketEventDto; canAnswer: boolean; onAnswer?: () => void; onEdit: () => void }) {
  const { t } = useTranslation('tickets');
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span className="font-medium text-fg">{event.actor?.name ?? t('timeline.system')} <span className="font-normal text-muted">· {t(`events.${event.type}`)}{event.replyTo && ` · ${t('reply.inReplyTo', { name: event.replyTo.name })}`}</span></span>
      <span className="flex items-center gap-1">
        {event.isEdited && <span>{t('reply.edited')}</span>}
        <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
        {event.mayEdit && <RowAction label={t('reply.edit')} icon={Pencil} onClick={onEdit} />}
        {canAnswer && onAnswer && <RowAction label={t('reply.answer')} icon={MessageSquareReply} onClick={onAnswer} />}
      </span>
    </div>
  );
}

/** One entry of the conversation: its header, its text (or the box that edits it) and files, and for a reply its reactions. */
export function Entry({ ticketId, event, canAnswer, onAnswer, nested }: EntryProps) {
  const [editing, setEditing] = useState(false);
  return (
    <div id={`event-${event.id}`} className={cn('rounded-2xl border p-4', 'border-neutral-200 bg-white', nested && 'bg-neutral-50')}>
      <EntryHeader event={event} canAnswer={canAnswer} onAnswer={onAnswer} onEdit={() => setEditing(true)} />
      {editing ? <ReplyEditor ticketId={ticketId} event={event} onDone={() => setEditing(false)} /> : event.body && <div className="mt-2"><MentionedText body={event.body} people={event.mentions} /></div>}
      <TicketFiles ticketId={ticketId} event={event} />
      {isReactableEvent(event) && <Reactions ticketId={ticketId} event={event} />}
    </div>
  );
}
