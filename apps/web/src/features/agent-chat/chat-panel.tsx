import { History, MessageSquarePlus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button } from '@/shared/ui';
import { AGENT_KEYS } from './keys';
import { Composer } from './composer';
import { HistoryList } from './history-list';
import { MessageList } from './message-list';
import { useChat } from './use-chat';

/** The assistant's side panel: header (new chat, history, close), the conversation, and the box to write in. */
export function ChatPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: () => void }) {
  const { t } = useTranslation('agentChat');
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const chat = useChat();
  const [showHistory, setShowHistory] = useState(false);
  const canUse = can(AGENT_KEYS.use);
  const openOld = async (id: string) => {
    if (await chat.open(id)) setShowHistory(false);
  };
  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3">
        <h2 className="text-base font-bold text-fg">{t('title')}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={t('newChat')} onClick={() => { chat.reset(); setShowHistory(false); }}><MessageSquarePlus className="size-4" aria-hidden /></Button>
          {can(AGENT_KEYS.history) && <Button variant="ghost" size="icon" aria-label={t('history.open')} aria-pressed={showHistory} onClick={() => setShowHistory(!showHistory)}><History className="size-4" aria-hidden /></Button>}
          <Button variant="ghost" size="icon" aria-label={t('close')} onClick={onClose}><X className="size-4" aria-hidden /></Button>
        </div>
      </header>
      {showHistory ? <HistoryList onOpen={(id) => void openOld(id)} /> : <MessageList messages={chat.messages} busy={chat.busy} live={chat.live} onConfirm={(id, fileIds) => void chat.confirmDraft(id, fileIds)} onCancel={(id) => void chat.cancelDraft(id)} onSendForm={(id, values) => void chat.sendForm(id, values)} formError={chat.formError} onNavigate={onNavigate} />}
      {chat.error && <div className="px-4 pb-2"><Alert>{errorMessage(tc, chat.error)}</Alert></div>}
      {!showHistory && (canUse ? <Composer busy={chat.busy} canAttach={can(AGENT_KEYS.attach)} canSpeak={can(AGENT_KEYS.voice)} onSend={(text, files) => void chat.ask(text, files)} /> : <p className="border-t border-neutral-200 p-3 text-sm text-muted">{t('readOnly')}</p>)}
    </>
  );
}
