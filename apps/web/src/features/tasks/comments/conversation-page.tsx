import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useTask } from '../api';
import { Alert, Button, PageHeader } from '@/shared/ui';
import { Conversation } from './conversation';
import { useConversation } from './comments.api';

/** The conversation alone: what a colleague of the category or a person who was mentioned opens (they do not see the task itself). */
export function ConversationPage() {
  const { t } = useTranslation('tasks');
  const { id } = useParams();
  const conversation = useConversation(id);
  const task = useTask(id);
  const title = conversation.data ? `${conversation.data.task.number} · ${conversation.data.task.title}` : t('comments.title');
  return (
    <>
      <PageHeader title={title} description={t('comments.pageHint')} actions={task.data ? <Button asChild variant="secondary"><Link to={`/tasks/${id}`}>{t('comments.openTask')}</Link></Button> : undefined} />
      {id ? <Conversation taskId={id} /> : <Alert>{t('comments.notFound')}</Alert>}
    </>
  );
}
