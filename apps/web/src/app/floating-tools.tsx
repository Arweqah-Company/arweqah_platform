import { AgentChat, useAgentAvailable } from '@/features/agent-chat';
import { ProblemReportButton } from '@/features/tickets';
import { cn } from '@/shared/lib/cn';

/** The one corner of the screen for the tools every page has: «Report a problem» and, at the end, the assistant, side by side. A person who lacks one sees the other alone in the corner. */
export function FloatingTools() {
  return (
    <div className="fixed bottom-4 end-4 z-30 flex items-center gap-2" data-testid="floating-tools">
      <ProblemReportButton />
      <AgentChat />
    </div>
  );
}

/** What a pop-up window carries in that same corner (`DialogToolsProvider`): the «Report a problem» button where the page's one is. It leaves room for the assistant's button while the assistant is on, so it covers the page's dimmed button exactly. */
export function DialogCornerTools() {
  const assistantShown = useAgentAvailable();
  return (
    <span className={cn('inline-flex', assistantShown && 'me-14')}>
      <ProblemReportButton inDialog />
    </span>
  );
}
