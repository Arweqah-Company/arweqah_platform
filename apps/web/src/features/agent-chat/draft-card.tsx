import type { AgentDraftDto } from '@arweqah-platform/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { Alert, Badge, Button } from '@/shared/ui';
import { AGENT_KEYS } from './keys';

interface Props {
  draft: AgentDraftDto;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONES = { pending: 'info', confirmed: 'success', cancelled: 'neutral', expired: 'warning', failed: 'danger' } as const;

/** True once the moment has passed: it changes by itself when that moment comes, even if the card was open all the while. */
function useLapsed(moment: string | null): boolean {
  const at = moment ? new Date(moment).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null || at <= now) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(at - Date.now() + 50, MAX_TIMER_MS)));
    return () => clearTimeout(timer);
  }, [at, now]);
  return at !== null && at <= now;
}

const MAX_TIMER_MS = 2_000_000_000;

/** The draft's status, turned into «expired» by itself when its time passes. */
function useStatus(draft: AgentDraftDto): AgentDraftDto['status'] {
  const lapsed = useLapsed(draft.status === 'pending' ? draft.expiresAt : null);
  return draft.status === 'pending' && lapsed ? 'expired' : draft.status;
}

/** The request the assistant prepared: what it will do, in the employee's words, and the buttons to confirm or cancel it (FR-141). A delete is red and says so. */
export function DraftCard({ draft, busy, onConfirm, onCancel }: Props) {
  const { t, i18n } = useTranslation('agentChat');
  const { can } = usePermissions();
  const status = useStatus(draft);
  const waiting = status === 'pending' && can(AGENT_KEYS.use);
  return (
    <section className="mt-2 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3" aria-label={t('draft.title')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-fg">{i18n.language === 'ar' ? draft.labelAr : draft.labelEn}</span>
        <Badge tone={TONES[status]}>{t(`draft.status.${status}`)}</Badge>
      </div>
      {draft.destructive && waiting && <Alert tone="danger">{t('draft.destructive')}</Alert>}
      <p className="text-sm text-fg">{draft.summary}</p>
      {draft.result && !draft.result.ok && <Alert tone="danger">{draft.result.message}</Alert>}
      {waiting ? <Decision destructive={draft.destructive} busy={busy} onConfirm={onConfirm} onCancel={onCancel} /> : status === 'expired' && <p className="text-xs text-muted">{t('draft.expiredHint')}</p>}
    </section>
  );
}

function Decision({ destructive, busy, onConfirm, onCancel }: { destructive: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation('agentChat');
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={destructive ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>{t('draft.confirm')}</Button>
      <Button size="sm" variant="secondary" disabled={busy} onClick={onCancel}>{t('draft.cancel')}</Button>
    </div>
  );
}
