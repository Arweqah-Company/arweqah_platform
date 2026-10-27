import * as Popover from '@radix-ui/react-popover';
import { CorePermission } from '@arweqah-platform/shared';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Can } from '@/core/permissions/can';
import { useLatestNotifications, useMarkRead, useUnreadCount } from './api/notifications.api';

const LINK = 'block rounded-xl px-3 py-2 text-sm hover:bg-neutral-50';

/** The bell: a drop-down with the newest notifications and a link to the whole page, never a jump straight to it. */
export function NotificationBell() {
  const { t, i18n } = useTranslation('notifications');
  const [open, setOpen] = useState(false);
  const count = useUnreadCount().data?.count ?? 0;
  const latest = useLatestNotifications(open);
  const markRead = useMarkRead();
  const ar = i18n.language === 'ar';
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="relative rounded-[var(--radius-control)] p-2 hover:bg-neutral-50 data-[state=open]:bg-neutral-50" aria-label={t('bell', { count })}>
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 grid min-w-5 place-items-center rounded-full bg-yellow-300 px-1 text-[11px] font-bold text-ink">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={16} aria-label={t('title')} className="animate-fade-in z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl shadow-ink/10">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <h2 className="font-bold">{t('title')}</h2>
            {count > 0 && <Can permission={CorePermission.NotificationsMarkRead}><button type="button" className="text-sm text-link hover:underline" onClick={() => markRead.mutate('all')}>{t('markAll')}</button></Can>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {latest.isPending && <p className="px-3 py-4 text-sm text-muted">…</p>}
            {latest.data?.items.length === 0 && <p className="px-3 py-4 text-sm text-muted">{t('emptyShort')}</p>}
            {latest.data?.items.map((n) => {
              const inner = (
                <span className={n.readAt ? 'text-muted' : 'font-medium'}>
                  <span className="block">{ar ? n.titleAr : n.titleEn}</span>
                  <span className="block text-xs font-normal text-muted">{new Date(n.createdAt).toLocaleString(i18n.language)}</span>
                </span>
              );
              return n.link?.startsWith('/') ? (
                <Link key={n.id} to={n.link} className={LINK} onClick={() => { markRead.mutate([n.id]); setOpen(false); }}>{inner}</Link>
              ) : (
                <div key={n.id} className={LINK}>{inner}</div>
              );
            })}
          </div>
          <div className="mt-1 border-t border-neutral-200 pt-1">
            <Link to="/notifications" className={`${LINK} text-center font-medium text-link`} onClick={() => setOpen(false)}>{t('viewAll')}</Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
