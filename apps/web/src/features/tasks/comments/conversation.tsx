import type { TaskCommentDto, TaskConversationDto } from '@arweqah-platform/shared';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert } from '@/shared/ui';
import { CommentComposer } from './comment-composer';
import { CommentItem } from './comment-item';
import { useConversation } from './comments.api';

/** The comments in the order they were written, each with its answers under it. */
function Thread({ taskId, conversation }: { taskId: string; conversation: TaskConversationDto }) {
  const { t } = useTranslation('tasks');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const roots = conversation.comments.filter((c) => c.parentId === null);
  const answersOf = (root: TaskCommentDto) => conversation.comments.filter((c) => c.parentId === root.id);
  const item = (comment: TaskCommentDto) => <CommentItem key={comment.id} taskId={taskId} conversation={conversation} comment={comment} replying={replyingTo === comment.id} onReply={() => setReplyingTo(comment.id)} onDone={() => setReplyingTo(null)} />;
  if (roots.length === 0) return <p className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-sm text-muted">{t('comments.empty')}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {roots.map((root) => (
        <li key={root.id} className="flex flex-col gap-2">
          <ul className="contents">{item(root)}</ul>
          {answersOf(root).length > 0 && <ul className="ms-6 flex flex-col gap-2 border-s-2 border-neutral-200 ps-3">{answersOf(root).map(item)}</ul>}
        </li>
      ))}
    </ol>
  );
}

/** The conversation of one task: the comments, a box to write in, and why the box is missing when it is. */
export function Conversation({ taskId }: { taskId: string }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const query = useConversation(taskId);
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  const conversation = query.data;
  if (!conversation) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  return (
    <div className="flex flex-col gap-4">
      {conversation.locked && <Alert tone="info"><span className="inline-flex items-center gap-2"><Lock className="size-4" aria-hidden />{t('comments.locked')}</span></Alert>}
      {conversation.isOutsider && <Alert tone="info">{t('comments.outsider')}</Alert>}
      <Thread taskId={taskId} conversation={conversation} />
      {conversation.can.write && <div className="rounded-2xl border border-neutral-200 bg-white p-4"><CommentComposer taskId={taskId} conversation={conversation} target={{ type: 'new' }} /></div>}
      {!conversation.can.write && !conversation.locked && <p className="text-sm text-muted">{t('comments.readOnly')}</p>}
    </div>
  );
}
