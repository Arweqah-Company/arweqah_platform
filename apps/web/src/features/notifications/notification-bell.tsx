import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useUnreadCount } from './api/notifications.api';

export function NotificationBell() {
  const { t } = useTranslation('notifications');
  const count = useUnreadCount().data?.count ?? 0;
  return (
    <Link to="/notifications" className="relative rounded-[var(--radius-control)] p-2 hover:bg-neutral-50" aria-label={t('bell', { count })}>
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -end-0.5 grid min-w-5 place-items-center rounded-full bg-yellow-300 px-1 text-[11px] font-bold text-ink">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
