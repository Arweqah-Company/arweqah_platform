import { defineConfig, devices } from '@playwright/test';

export const WEB_URL = 'http://localhost:4173';
const API_ENV = { NODE_ENV: 'test', PORT: '3000' };

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
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      env: API_ENV,
    },
    {
      // Built web app; vite preview proxies /api to the API like nginx does in production.
      command: 'npm run preview -w @arweqah-platform/web',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
