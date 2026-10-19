import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">{t('errors.notFound')}</h1>
      <Link to="/" className="mt-4 inline-block text-navy-700 underline underline-offset-4">
        {t('nav.home')}
      </Link>
    </div>
  );
}
