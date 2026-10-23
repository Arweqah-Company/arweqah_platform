import { DirectionProvider } from '@radix-ui/react-direction';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from '@/core/theme/theme';
import { MESSAGE_TONES } from '@/shared/ui/message-tones';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

const TOAST = 'flex w-[min(92vw,26rem)] items-start gap-3 rounded-[var(--radius-control)] border border-s-4 border-neutral-200 bg-white px-4 py-3 text-sm text-fg shadow-lg shadow-ink/10';

/** Toasts use the same four colors as alerts: information blue, warning yellow, error red, success green. */
function ThemedToaster({ dir }: { dir: 'rtl' | 'ltr' }) {
  const classNames = { toast: TOAST, success: MESSAGE_TONES.success.toast, error: MESSAGE_TONES.danger.toast, info: MESSAGE_TONES.info.toast, warning: MESSAGE_TONES.warning.toast, description: 'text-muted', icon: 'mt-0.5 shrink-0' };
  return <Toaster position="bottom-center" dir={dir} theme={useTheme().resolved} toastOptions={{ unstyled: true, classNames }} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DirectionProvider dir={dir}>
          {children}
          <ThemedToaster dir={dir} />
        </DirectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
