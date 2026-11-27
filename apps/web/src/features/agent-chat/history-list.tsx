import { formatDateTime } from '@/shared/lib/format-date';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/shared/ui';
import { errorMessage } from '@/shared/lib/error-message';
import { useConversations } from './api';

/** The person's earlier conversations (`agent.history_view`); choosing one opens it. */
export function HistoryList({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation('agentChat');
  const { t: tc } = useTranslation();
  const list = useConversations(true);
  if (list.isError) return <div className="p-4"><Alert>{errorMessage(tc, list.error)}</Alert></div>;
  if (!list.data) return <p role="status" className="p-4 text-sm text-muted">{t('history.loading')}</p>;
  if (list.data.length === 0) return <p className="p-4 text-sm text-muted">{t('history.none')}</p>;
  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
      {list.data.map((c) => (
        <li key={c.id}>
          <button type="button" className="w-full rounded-xl px-3 py-2 text-start text-sm text-fg hover:bg-neutral-50" onClick={() => onOpen(c.id)}>
            <span className="block truncate font-medium">{c.title}</span>
            <span className="block text-xs text-muted">{formatDateTime(c.updatedAt)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
