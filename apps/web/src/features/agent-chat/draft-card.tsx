import type { AgentDraftDto } from '@arweqah-platform/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { Alert, Badge, Button } from '@/shared/ui';
import { ChatImage } from './chat-image';
import { AGENT_KEYS } from './keys';

interface Props {
  draft: AgentDraftDto;
  busy: boolean;
  /** With the ids of the pictures left ticked (none when the card offers none). */
  onConfirm: (fileIds: string[]) => void;
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

/** The pictures the card offers, all ticked at first; `chosen` is what is sent when the request is confirmed. */
function useTickedPictures(draft: AgentDraftDto) {
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(draft.files.map((f) => f.id)));
  const toggle = (id: string) => setTicked((now) => {
    const next = new Set(now);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  return { ticked, toggle, chosen: draft.files.filter((f) => ticked.has(f.id)).map((f) => f.id) };
}

/** The request the assistant prepared: what it will do, in the employee's words, and the buttons to confirm or cancel it (FR-141). A delete is red and says so. */
export function DraftCard({ draft, busy, onConfirm, onCancel }: Props) {
  const { t, i18n } = useTranslation('agentChat');
  const { can } = usePermissions();
  const status = useStatus(draft);
  const waiting = status === 'pending' && can(AGENT_KEYS.use);
  const pictures = useTickedPictures(draft);
  return (
    <section className="mt-2 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3" aria-label={t('draft.title')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-fg">{i18n.language === 'ar' ? draft.labelAr : draft.labelEn}</span>
        <Badge tone={TONES[status]}>{t(`draft.status.${status}`)}</Badge>
      </div>
      {draft.destructive && waiting && <Alert tone="danger">{t('draft.destructive')}</Alert>}
      <p className="text-sm text-fg">{draft.summary}</p>
      {waiting && draft.files.length > 0 && <PicturesToAttach draft={draft} ticked={pictures.ticked} onToggle={pictures.toggle} />}
      {draft.result && !draft.result.ok && <Alert tone="danger">{draft.result.message}</Alert>}
      <Ending waiting={waiting} expired={status === 'expired'} destructive={draft.destructive} busy={busy} onConfirm={() => onConfirm(pictures.chosen)} onCancel={onCancel} />
    </section>
  );
}

/** Under the card: the buttons while it waits, the hint once it lapsed, nothing otherwise. */
function Ending({ waiting, expired, ...decision }: { waiting: boolean; expired: boolean; destructive: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation('agentChat');
  if (waiting) return <Decision {...decision} />;
  return expired ? <p className="text-xs text-muted">{t('draft.expiredHint')}</p> : null;
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

/** The conversation's pictures that may go with the request, each with a box: ticked ones are attached (FR-180). */
function PicturesToAttach({ draft, ticked, onToggle }: { draft: AgentDraftDto; ticked: Set<string>; onToggle: (id: string) => void }) {
  const { t } = useTranslation('agentChat');
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-medium text-muted">{t('draft.pictures')}</legend>
      <ul className="flex flex-wrap gap-3">
        {draft.files.map((file) => (
          <li key={file.id} className="flex flex-col items-center gap-1">
            <ChatImage file={file} className="size-16" />
            <input type="checkbox" className="size-5 accent-petrol-800" aria-label={t('draft.attachPicture', { name: file.name })} checked={ticked.has(file.id)} onChange={() => onToggle(file.id)} />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
