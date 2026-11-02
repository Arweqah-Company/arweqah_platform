import type { SessionDto } from '@arweqah-platform/shared';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Badge, Button, RowAction } from '@/shared/ui';
import { useEndOtherSessions, useEndSession, useSessions } from './api';

/** The devices the person is signed in on: end one, or all the others. */
export function SessionsSection() {
  const { t, i18n } = useTranslation('security');
  const { t: tc } = useTranslation();
  const sessions = useSessions();
  const end = useEndSession();
  const endOthers = useEndOtherSessions();
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language);
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  const others = (sessions.data ?? []).filter((s) => !s.current).length;
  return (
    <section aria-labelledby="sessions-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sessions-title" className="text-lg font-bold">{t('sessions.title')}</h2>
        <Button size="sm" variant="secondary" disabled={!others || endOthers.isPending} onClick={() => void run(() => endOthers.mutateAsync(), t('sessions.endedOthers'))}>{t('sessions.endOthers')}</Button>
      </div>
      <p className="mt-1 text-sm text-muted">{t('sessions.description')}</p>
      {sessions.isError && <Alert>{errorMessage(tc, sessions.error)}</Alert>}
      <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {(sessions.data ?? []).map((s: SessionDto) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">{s.device || t('sessions.unknownDevice')}{s.current && <Badge tone="success">{t('sessions.current')}</Badge>}</p>
              <p className="text-xs text-muted"><span dir="ltr">{s.ip ?? '—'}</span> · {t('sessions.lastActive', { when: when(s.lastActiveAt) })}</p>
            </div>
            {!s.current && <RowAction label={t('sessions.end')} icon={LogOut} danger onClick={() => void run(() => end.mutateAsync(s.id), t('sessions.ended'))} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
