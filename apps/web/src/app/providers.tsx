import { DirectionProvider } from '@radix-ui/react-direction';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

export function Providers({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir={dir}>
        {children}
        <Toaster position="bottom-center" dir={dir} />
      </DirectionProvider>
    </QueryClientProvider>
  );
}
