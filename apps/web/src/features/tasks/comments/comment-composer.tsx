import { MAX_COMMENT_TEXT, type FileDto, type TaskCommentDto, type TaskConversationDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, FileAttachments } from '@/shared/ui';
import { useEditComment, usePostComment } from './comments.api';
import { MentionTextarea } from './mention-textarea';
import { decodeMentions, encodeMentions, type Mentioned } from './mention-text';

export type ComposerTarget = { type: 'new' } | { type: 'reply'; comment: TaskCommentDto } | { type: 'edit'; comment: TaskCommentDto };

interface Props {
  taskId: string;
  conversation: TaskConversationDto;
  target: ComposerTarget;
  onDone?: () => void;
}

/** The state and the sending of the box: a new comment, an answer to one, or the new text of one's own comment. */
function useComposer({ taskId, conversation, target, onDone }: Props) {
  const { t } = useTranslation('tasks');
  const post = usePostComment(taskId);
  const edit = useEditComment(taskId);
  const people = target.type === 'edit' ? target.comment.mentions : [];
  const [text, setText] = useState(() => (target.type === 'edit' ? decodeMentions(target.comment.body, people) : ''));
  const [picked, setPicked] = useState<Mentioned[]>(people);
  const [files, setFiles] = useState<FileDto[]>([]);
  const busy = post.isPending || edit.isPending;
  const canSend = !busy && (text.trim().length > 0 || (target.type !== 'edit' && files.length > 0));
  const send = async () => {
    if (!canSend) return;
    const body = encodeMentions(text, picked);
    try {
      if (target.type === 'edit') await edit.mutateAsync({ id: target.comment.id, body });
      else await post.mutateAsync({ body, fileIds: files.map((f) => f.id), replyTo: target.type === 'reply' ? target.comment.id : undefined });
      setText('');
      setFiles([]);
      setPicked([]);
      toast.success(t(target.type === 'edit' ? 'comments.saved' : 'comments.sent'));
      onDone?.();
    } catch {
      /* shown above the box */
    }
  };
  const addPicked = (person: Mentioned) => setPicked((all) => (all.some((p) => p.id === person.id) ? all : [...all, person]));
  return { text, setText, files, setFiles, busy, canSend, send, addPicked, error: post.error ?? edit.error, mayUpload: target.type !== 'edit' && conversation.can.upload };
}

/** Writes a comment, an answer, or an edit; Ctrl+Enter sends and `@` offers people to mention. */
export function CommentComposer(props: Props) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const c = useComposer(props);
  const { target, conversation } = props;
  const label = t(`comments.${target.type === 'new' ? 'write' : target.type === 'reply' ? 'replyTo' : 'editing'}`, { name: target.type === 'reply' ? target.comment.author.name : '' });
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void c.send(); }} noValidate>
      {c.error && <Alert>{errorMessage(tc, c.error)}</Alert>}
      <MentionTextarea taskId={props.taskId} value={c.text} onChange={c.setText} onPick={c.addPicked} label={label} mayMention={conversation.can.mention} maxLength={MAX_COMMENT_TEXT} onSubmit={() => void c.send()} />
      {c.mayUpload && <FileAttachments files={c.files} onChange={c.setFiles} max={conversation.maxFiles} label={t('comments.attach')} />}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{conversation.can.mention ? t('comments.hint') : t('comments.hintNoMention')}</span>
        <div className="flex gap-2">
          {target.type !== 'new' && <Button type="button" variant="ghost" onClick={props.onDone}>{tc('actions.cancel')}</Button>}
          <Button type="submit" disabled={!c.canSend}>{t(target.type === 'edit' ? 'comments.saveEdit' : 'comments.send')}</Button>
        </div>
      </div>
    </form>
  );
}
