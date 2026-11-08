import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { cn } from '../lib/cn';
import { Button } from './button';
import { ErrorIllustration } from './error-illustration';

export type ErrorCode = 401 | 403 | 404 | 500;

interface ErrorPageProps {
  code: ErrorCode;
  /** Whole-screen (outside the app shell) or inside the content area. */
  fullScreen?: boolean;
  /** Technical detail of an unexpected error: shown only while developing. */
  detail?: string;
}

/** Same page for 401, 403 and 404: what happened, what to do, one button; the picture sits on the end side. */
export function ErrorPage({ code, fullScreen = false, detail }: ErrorPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));
  return (
    <main className={cn('grid place-items-center bg-white px-6 py-12', fullScreen ? 'min-h-screen' : 'min-h-[70vh] rounded-3xl border border-neutral-200')}>
      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold leading-snug text-fg">{t(`errorPage.${code}.title`)}</h1>
          <p className="mt-4 max-w-[48ch] text-lg text-muted">{t(`errorPage.${code}.description`)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {code === 401 ? (
              <Button asChild><Link to="/login">{t('errorPage.signIn')}</Link></Button>
            ) : code === 500 ? (
              <>
                <Button onClick={() => window.location.reload()}>{t('errorPage.reload')}</Button>
                <Button asChild variant="secondary"><Link to="/">{t('nav.home')}</Link></Button>
              </>
            ) : (
              <>
                <Button onClick={back}>{t('errorPage.back')}</Button>
                <Button asChild variant="secondary"><Link to="/">{t('nav.home')}</Link></Button>
              </>
            )}
          </div>
          {detail && <pre dir="ltr" className="mt-6 max-h-40 overflow-auto rounded-xl bg-neutral-50 p-3 text-start text-xs text-muted">{detail}</pre>}
        </div>
        <div className="flex justify-center"><ErrorIllustration code={code} /></div>
      </div>
    </main>
  );
}
