import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMe } from '@/core/auth/session';
import { useNavItems } from '@/core/navigation';
import { useUnreadCount } from '@/features/notifications';

export function HomePage() {
  const { t } = useTranslation('home');
  const { t: tc } = useTranslation();
  const me = useMe().data;
  const unread = useUnreadCount().data?.count ?? 0;
  const shortcuts = useNavItems().filter((n) => n.to !== '/');
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold">{t('greeting', { name: me?.name.split(' ')[0] ?? '' })}</h1>
      <p className="mt-2 max-w-[65ch] text-muted">{t('intro')}</p>
      <Link to="/notifications" className="mt-8 flex items-center justify-between border-y border-line py-4 hover:bg-white">
        <span className="font-medium">{unread ? t('unread', { count: unread }) : t('noUnread')}</span>
      </Link>
      <h2 className="mt-10 text-lg font-bold">{t('shortcuts')}</h2>
      <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {shortcuts.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 border-b border-line py-3 hover:text-navy-700">
              <Icon className="size-4 text-gold-600" aria-hidden />
              {tc(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
