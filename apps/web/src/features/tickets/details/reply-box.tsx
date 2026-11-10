import { CorePermission, MAX_TICKET_FILES, MAX_TICKET_TEXT, type FileDto, type TicketEventDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { encodeMentions, type Mentioned } from '@/shared/lib/mention-text';
import { Alert, Button, FileAttachments, MentionTextarea } from '@/shared/ui';
import { useTicketMentionables, useTicketReply } from '../api';

interface Props {
  ticketId: string;
  /** The reply being answered: the box then sits under it and names whom it answers. */
  answering?: TicketEventDto;
  onDone?: () => void;
}

/** The state and the sending of the box: the text with the people picked from the @ list, and the files. */
function useReply({ ticketId, answering, onDone }: Props) {
  const { t } = useTranslation('tickets');
  const reply = useTicketReply(ticketId);
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<Mentioned[]>([]);
  const [files, setFiles] = useState<FileDto[]>([]);
  const send = async () => {
    if (!body.trim() || reply.isPending) return;
    try {
      await reply.mutateAsync({ body: encodeMentions(body, picked), fileIds: files.map((f) => f.id), parentEventId: answering?.id });
      setBody('');
      setPicked([]);
      setFiles([]);
      toast.success(t('reply.sent'));
      onDone?.();
    } catch {
      /* shown above the box */
    }
  };
  const pick = (person: Mentioned) => setPicked((all) => (all.some((p) => p.id === person.id) ? all : [...all, person]));
  return { reply, body, setBody, files, setFiles, send, pick };
}

/** Answer on a ticket, or on one of its replies, with files; `@` offers people to mention and Ctrl+Enter sends. */
export function ReplyBox(props: Props) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const mayMention = usePermissions().can(CorePermission.TicketsCommentMention);
  const r = useReply(props);
  const label = props.answering ? t('reply.answerTo', { name: props.answering.actor?.name ?? '' }) : t('reply.label');
  return (
    <form className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); void r.send(); }} noValidate>
      {r.reply.isError && <Alert>{errorMessage(tc, r.reply.error)}</Alert>}
      <span className="text-sm font-medium">{label}</span>
      <MentionTextarea usePeople={useTicketMentionables} scopeId={props.ticketId} listLabel={t('reply.mentionList')} label={label} mayMention={mayMention} maxLength={MAX_TICKET_TEXT} value={r.body} onChange={r.setBody} onPick={r.pick} onSubmit={() => void r.send()} />
      <FileAttachments compact files={r.files} onChange={r.setFiles} max={MAX_TICKET_FILES} label={t('details.attachments')} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{mayMention ? t('reply.hint') : t('details.shortcut')}</span>
        <div className="flex gap-2">
          {props.answering && <Button type="button" variant="ghost" onClick={props.onDone}>{tc('actions.cancel')}</Button>}
          <Button type="submit" disabled={r.reply.isPending || !r.body.trim()}>{t('reply.send')}</Button>
        </div>
      </div>
    </form>
  );
}
