import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/core/i18n';

/** Sign-in frame: the arcade mark in navy beside a quiet form. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <button
            type="button"
            className="mt-10 text-sm text-muted underline-offset-4 hover:underline"
            onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
          >
            {t('language.switchTo')}
          </button>
        </div>
      </main>
      <aside className="relative hidden overflow-hidden bg-navy-900 lg:block" aria-hidden="true">
        <ArcadePattern />
        <p className="absolute bottom-12 start-12 font-heading text-4xl font-bold leading-tight text-white">{t('appName')}</p>
      </aside>
    </div>
  );
}

/** Repeating arches, after the name أروقة (arcades). The one decorative element of the product. */
function ArcadePattern() {
  return (
    <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 600">
      <defs>
        <pattern id="arches" width="80" height="120" patternUnits="userSpaceOnUse">
          <path d="M8 120V48a32 32 0 0 1 64 0v72" fill="none" stroke="var(--color-gold-500)" strokeOpacity="0.35" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="400" height="600" fill="url(#arches)" />
    </svg>
  );
}
