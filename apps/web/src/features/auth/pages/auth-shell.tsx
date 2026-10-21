import { Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/core/i18n';
import { BrandLogo } from '@/shared/ui';

/** Quiet decoration on the dark `ink` screen: petrol bars and block, a green dot grid. Purely visual, never carries meaning. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute start-10 top-24 hidden h-56 w-16 text-petrol-800 sm:block" viewBox="0 0 64 224" fill="currentColor">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <g key={row}>
            <rect x="0" y={row * 38} width="10" height="26" rx="2" />
            {row % 2 === 1 && <rect x="26" y={row * 38} width="10" height="26" rx="2" />}
            {row !== 1 && <rect x="52" y={row * 38} width="10" height="26" rx="2" />}
          </g>
        ))}
      </svg>
      <div className="absolute end-[26%] top-0 h-36 w-24 rounded-b-md bg-petrol-800" />
      <div className="absolute start-[16%] top-0 hidden size-20 sm:block rounded-b-full bg-green-400/60" />
      <svg className="absolute end-12 bottom-24 hidden h-48 w-48 text-green-400/50 md:block" viewBox="0 0 160 160" fill="currentColor">
        {Array.from({ length: 25 }, (_, i) => (
          <circle key={i} cx={(i % 5) * 32 + 8} cy={Math.floor(i / 5) * 32 + 8} r="4" />
        ))}
      </svg>
    </div>
  );
}

/** Sign-in frame: centered cream card on a dark ink screen, language switch on top, copyright below. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="on-dark relative flex min-h-screen flex-col bg-ink text-cream">
      <Backdrop />
      <header className="relative z-10 p-5">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-cream/40 px-4 text-sm text-cream transition-colors duration-150 hover:bg-cream/10"
          onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
        >
          <Globe className="size-4" aria-hidden />
          {t('language.switchTo')}
        </button>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="animate-fade-in w-full max-w-md rounded-3xl bg-white p-8 text-ink shadow-2xl shadow-black/30 sm:p-10">
          <BrandLogo layout="horizontal" width={176} className="mb-8" />
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </main>
      <footer className="relative z-10 pb-6 text-center text-xs text-cream/80">{t('footer.rights', { year: new Date().getFullYear() })}</footer>
    </div>
  );
}
