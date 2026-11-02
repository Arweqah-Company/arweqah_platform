import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

/** The Cloudflare script, added to the page once and only when a bot check is actually shown. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not start')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Turnstile could not be loaded'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

interface Props {
  siteKey: string;
  /** The answer to send with the request; null when it expired or failed. An answer is good for one use. */
  onToken: (token: string | null) => void;
  /** Change it to show a fresh check (after a request used the answer). */
  resetKey?: number;
}

/** Cloudflare Turnstile, in the language and the theme of the page. */
export function Turnstile({ siteKey, onToken, resetKey = 0 }: Props) {
  const { i18n } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const notify = useRef(onToken);
  useEffect(() => {
    notify.current = onToken;
  });

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    notify.current(null);
    loadTurnstile()
      .then((api) => {
        if (cancelled || !host.current) return;
        widgetId = api.render(host.current, {
          sitekey: siteKey,
          language: i18n.language === 'en' ? 'en' : 'ar',
          theme: 'auto',
          callback: (token: string) => notify.current(token),
          'expired-callback': () => notify.current(null),
          'error-callback': () => notify.current(null),
        });
      })
      .catch(() => notify.current(null));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, i18n.language, resetKey]);

  return <div ref={host} data-testid="turnstile" className="min-h-[65px]" />;
}
