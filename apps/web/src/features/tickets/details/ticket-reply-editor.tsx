import { CorePermission, MAX_TICKET_TEXT, type TicketEventDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { decodeMentions, encodeMentions, type Mentioned } from '@/shared/lib/mention-text';
import { Alert, Button, MentionTextarea } from '@/shared/ui';
import { useEditTicketReply, useTicketMentionables } from '../api';

/** The new text of one's own reply, in place: `@` offers people to mention and Ctrl+Enter saves. Files stay as they were. */
export function ReplyEditor({ ticketId, event, onDone }: { ticketId: string; event: TicketEventDto; onDone: () => void }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const edit = useEditTicketReply(ticketId);
  const [text, setText] = useState(() => decodeMentions(event.body ?? '', event.mentions));
  const [picked, setPicked] = useState<Mentioned[]>(event.mentions);
  const mayMention = usePermissions().can(CorePermission.TicketsCommentMention);
  const blocked = edit.isPending || !text.trim();
  const save = async () => {
    if (blocked) return;
    try {
      await edit.mutateAsync({ eventId: event.id, body: encodeMentions(text, picked) });
      toast.success(t('reply.saved'));
      onDone();
    } catch {
      /* shown above the box */
    }
  };
  return (
    <form className="mt-2 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
      {edit.isError && <Alert>{errorMessage(tc, edit.error)}</Alert>}
      <MentionTextarea usePeople={useTicketMentionables} scopeId={ticketId} listLabel={t('reply.mentionList')} label={t('reply.editing')} mayMention={mayMention} maxLength={MAX_TICKET_TEXT} value={text} onChange={setText} onPick={(p) => setPicked((all) => (all.some((x) => x.id === p.id) ? all : [...all, p]))} onSubmit={() => void save()} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>{tc('actions.cancel')}</Button>
        <Button type="submit" disabled={blocked}>{t('reply.saveEdit')}</Button>
      </div>
    </form>
  );
}
