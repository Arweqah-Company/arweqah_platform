import { DirectionProvider } from '@radix-ui/react-direction';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from '@/core/theme/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

function ThemedToaster({ dir }: { dir: 'rtl' | 'ltr' }) {
  return <Toaster position="bottom-center" dir={dir} theme={useTheme().resolved} />;
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
