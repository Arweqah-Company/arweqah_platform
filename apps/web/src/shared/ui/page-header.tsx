import { ChevronLeft, Home } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { NAV_GROUPS, useNavItems } from '@/core/navigation';

interface Crumb {
  label: string;
  to?: string;
}

/** The trail of the page from the menu: its menu group, the list it belongs to (when this is a page inside it), then the page itself. */
function useCrumbs(current: string): Crumb[] {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const item = useNavItems()
    .filter((n) => n.to !== '/' && (pathname === n.to || pathname.startsWith(`${n.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  if (!item) return [{ label: current }];
  const trail: Crumb[] = item.group ? [{ label: t(NAV_GROUPS[item.group].labelKey) }] : [];
  if (pathname !== item.to) trail.push({ label: t(item.labelKey), to: item.to });
  return [...trail, { label: current }];
}

/** Home icon › menu group › list › current page, so every screen shows where it sits. */
function Breadcrumb({ current }: { current: string }) {
  const { t } = useTranslation();
  const crumbs = useCrumbs(current);
  return (
    <nav aria-label={t('nav.breadcrumb')} className="mb-2">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <li>
          <Link to="/" className="grid size-6 place-items-center rounded-md text-link transition-colors hover:bg-petrol-50" aria-label={t('nav.home')}>
            <Home className="size-4" aria-hidden />
          </Link>
        </li>
        {crumbs.map((c, i) => (
          <Fragment key={`${i}-${c.label}`}>
            <li aria-hidden><ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" /></li>
            <li aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
              {c.to ? <Link to={c.to} className="text-link hover:underline">{c.label}</Link> : c.label}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6">
      <Breadcrumb current={title} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 data-tour="page-title" className="text-2xl font-bold text-fg">{title}</h1>
          {description && <p className="mt-1 max-w-[70ch] text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </header>
  );
}
