import { SendHorizontal } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_MESSAGE_MAX_CHARS } from '@arweqah-platform/shared';
import { Button, Textarea } from '@/shared/ui';

/** The box the employee writes in: Enter sends, Shift+Enter adds a line. */
export function Composer({ busy, onSend }: { busy: boolean; onSend: (text: string) => void }) {
  const { t } = useTranslation('agentChat');
  const [text, setText] = useState('');
  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <form className="flex items-end gap-2 border-t border-neutral-200 p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Textarea aria-label={t('write')} placeholder={t('placeholder')} rows={2} maxLength={AGENT_MESSAGE_MAX_CHARS} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} className="min-h-12 flex-1 resize-none" />
      <Button type="submit" size="icon" aria-label={t('send')} disabled={busy || !text.trim()}>
        <SendHorizontal className="size-4 rtl:-scale-x-100" aria-hidden />
      </Button>
    </form>
  );
}
