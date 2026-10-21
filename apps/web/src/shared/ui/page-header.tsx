import { ChevronLeft, Home } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** Home icon › current page, so every screen shows where it sits. */
function Breadcrumb({ current }: { current: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('nav.breadcrumb')} className="mb-2">
      <ol className="flex items-center gap-2 text-sm text-muted">
        <li>
          <Link to="/" className="grid size-6 place-items-center rounded-md text-petrol-800 transition-colors hover:bg-petrol-50" aria-label={t('nav.home')}>
            <Home className="size-4" aria-hidden />
          </Link>
        </li>
        <li aria-hidden><ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" /></li>
        <li aria-current="page">{current}</li>
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
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-[70ch] text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </header>
  );
}
