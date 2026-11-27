import type { ProblemContext } from '@arweqah-platform/shared';
import { diagnosticsSnapshot } from '@/core/api/problem-diagnostics';

/** What the screen says about itself for a report: the page, the window, the browser, the language and theme, and the last failures (see `problem-diagnostics`). */
export function buildProblemContext(language: string): ProblemContext {
  const { failedRequests, errors } = diagnosticsSnapshot();
  return {
    pageTitle: document.title.slice(0, 200),
    path: window.location.pathname.slice(0, 300),
    language: language === 'en' ? 'en' : 'ar',
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    browser: navigator.userAgent.slice(0, 300),
    appVersion: String(import.meta.env.VITE_APP_VERSION ?? '').slice(0, 60),
    failedRequests,
    errors,
  };
}
