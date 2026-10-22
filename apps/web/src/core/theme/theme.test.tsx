import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../test/msw';
import { ThemeToggle } from '@/shared/ui';
import { ME_KEY } from '../auth/session';
import { ThemeProvider, useTheme } from './theme';

const html = () => document.documentElement.getAttribute('data-theme');
const mediaDark = (dark: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark && query.includes('dark'), addEventListener: () => undefined, removeEventListener: () => undefined }));

function Probe() {
  const { preference, resolved } = useTheme();
  return <p>{`${preference}/${resolved}`}</p>;
}

function setup(saved?: 'light' | 'dark' | 'system') {
  const client = new QueryClient();
  if (saved) client.setQueryData(ME_KEY, { ...me(), theme: saved });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider><Probe /><ThemeToggle /></ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => { window.localStorage.clear(); document.documentElement.removeAttribute('data-theme'); mediaDark(false); });
afterEach(() => vi.unstubAllGlobals());

describe('Light and dark theme (FR-33)', () => {
  it('starts with the device theme when nothing was chosen', () => {
    mediaDark(true);
    setup();
    expect(screen.getByText('system/dark')).toBeInTheDocument();
    expect(html()).toBe('dark');
  });

  it('applies the theme saved on the account on a new device', () => {
    setup('dark');
    expect(screen.getByText('dark/dark')).toBeInTheDocument();
    expect(html()).toBe('dark');
  });

  it('the toggle switches the theme, remembers it in the browser and saves it on the account', async () => {
    let body: unknown;
    server.use(http.put('*/api/me/profile', async ({ request }) => { body = await request.json(); return HttpResponse.json({ preferences: { locale: 'ar', theme: 'dark' }, employee: null }); }));
    setup();
    expect(html()).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى الوضع الداكن' }));
    expect(html()).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'التبديل إلى الوضع الفاتح' })).toBeInTheDocument();
    await vi.waitFor(() => expect(body).toEqual({ theme: 'dark' }));
  });

  it('keeps this browser\'s choice when the account has only the default "system"', () => {
    window.localStorage.setItem('theme', 'dark');
    setup('system');
    expect(screen.getByText('dark/dark')).toBeInTheDocument();
  });

  it("the person's own choice in this page wins over the saved one", () => {
    server.use(http.put('*/api/me/profile', () => HttpResponse.json({ preferences: { locale: 'ar', theme: 'light' }, employee: null })));
    setup('dark');
    fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى الوضع الفاتح' }));
    expect(html()).toBe('light');
  });
});
