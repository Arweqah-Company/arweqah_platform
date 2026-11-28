import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { Button, CORNER_BUTTON } from '@/shared/ui';
import { ChatPanel } from './chat-panel';
import { AGENT_KEYS } from './keys';

/** Whether the assistant is on the screen: the person holds `agent.view` and the administrator has it switched on (FR-150). */
export function useAgentAvailable(): boolean {
  const { can } = usePermissions();
  return useMe().data?.agentEnabled !== false && can(AGENT_KEYS.view);
}

/** The platform assistant: a round button that opens a side panel (FR-145). The button sits in the corner tools of every page (`FloatingTools`, beside «Report a problem»); the panel opens above it. */
export function AgentChat() {
  const { t } = useTranslation('agentChat');
  const available = useAgentAvailable();
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
  if (!available) return null;
  return (
    <>
      {open && (
        <aside ref={panel} tabIndex={-1} role="dialog" aria-label={t('title')} className="fixed outline-none inset-x-3 bottom-20 z-30 flex h-[min(36rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-xl sm:inset-x-auto sm:end-4 sm:w-[26rem]">
          <ChatPanel onClose={() => setOpen(false)} onNavigate={() => { if (window.innerWidth < 640) setOpen(false); }} />
        </aside>
      )}
      <Button ref={opener} size="icon" className={CORNER_BUTTON} aria-label={t('open')} aria-expanded={open} data-tour="agent-chat" onClick={() => setOpen(!open)}>
        <Sparkles className="size-5" aria-hidden />
      </Button>
    </>
  );
}
