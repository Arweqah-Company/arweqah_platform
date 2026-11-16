import type { AgentDraftDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button } from '@/shared/ui';

interface Props {
  draft: AgentDraftDto;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONES = { pending: 'info', confirmed: 'success', cancelled: 'neutral', expired: 'warning', failed: 'danger' } as const;

/** The request the assistant prepared: what it will do, in the employee's words, and the buttons to confirm or cancel it (FR-141). A delete is red and says so. */
export function DraftCard({ draft, busy, onConfirm, onCancel }: Props) {
  const { t, i18n } = useTranslation('agentChat');
  const [shownAt] = useState(() => Date.now());
  const status = draft.status === 'pending' && new Date(draft.expiresAt).getTime() <= shownAt ? 'expired' : draft.status;
  const waiting = status === 'pending';
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
