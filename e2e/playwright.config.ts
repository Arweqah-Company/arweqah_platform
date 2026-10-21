import { defineConfig, devices } from '@playwright/test';

export const WEB_URL = 'http://localhost:4173';
// The browser tests sign in many times from one address (limit raised), and must never send real e-mail.
export const API_PORT = '3100';
const API_ENV = { NODE_ENV: 'test', PORT: API_PORT, API_URL: `http://localhost:${API_PORT}`, SIGN_IN_RATE_LIMIT: '1000', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASSWORD: '' };

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // one shared test database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  globalSetup: './global-setup.ts',
  use: { baseURL: WEB_URL, locale: 'ar-SA', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // Built API against the test database (MESSAGE_BUS=memory via .env.test).
      command: 'node ../apps/api/dist/main.js',
      url: `http://localhost:${API_PORT}/api/health`,
      // Never reuse: a server on this port could be pointing at a development database.
      reuseExistingServer: false,
      env: API_ENV,
    },
    {
      // Built web app; vite preview proxies /api to the API like nginx does in production.
      command: 'npm run preview -w @arweqah-platform/web',
      url: WEB_URL,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
