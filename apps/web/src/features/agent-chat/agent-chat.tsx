import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { Button } from '@/shared/ui';
import { ChatPanel } from './chat-panel';
import { AGENT_KEYS } from './keys';

/** The platform assistant: a round button in the corner of every page that opens a side panel (FR-145). Shown only to who holds `agent.view`, and only while the administrator has it switched on (FR-150). */
export function AgentChat() {
  const { t } = useTranslation('agentChat');
  const { can } = usePermissions();
  const agentEnabled = useMe().data?.agentEnabled !== false;
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // Opening moves the focus into the panel (it comes before the button in the page); closing gives it back to the button.
  useEffect(() => {
    if (open) panel.current?.focus();
    else if (wasOpen.current) opener.current?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (!agentEnabled || !can(AGENT_KEYS.view)) return null;
  return (
    <>
      {open && (
        <aside ref={panel} tabIndex={-1} role="dialog" aria-label={t('title')} className="fixed outline-none inset-x-3 bottom-20 z-30 flex h-[min(36rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-xl sm:inset-x-auto sm:end-4 sm:w-[26rem]">
          <ChatPanel onClose={() => setOpen(false)} onNavigate={() => { if (window.innerWidth < 640) setOpen(false); }} />
        </aside>
      )}
      <Button ref={opener} size="icon" className="fixed bottom-4 end-4 z-30 size-12 rounded-full" aria-label={t('open')} aria-expanded={open} data-tour="agent-chat" onClick={() => setOpen(!open)}>
        <Sparkles className="size-5" aria-hidden />
      </Button>
    </>
  );
}
