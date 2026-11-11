import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Dev and preview: `/docs` is the static manual in `public/docs`, not a route of the app (nginx does the same in production). */
const docsRedirect: Plugin = {
  name: 'docs-redirect',
  configureServer: (server) => {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/docs') return (res.writeHead(301, { Location: '/docs/' }), res.end());
      if (req.url?.startsWith('/docs/') && req.url.endsWith('/')) req.url += 'index.html'; // before the SPA fallback
      return next();
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), docsRedirect],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Use the shared contracts from source (ESM) instead of the CommonJS build.
      '@arweqah-platform/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Same origin in dev, like nginx in production: cookies stay first-party.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
  // The browser tests run their own API (test database) on another port and point the preview at it.
  preview: { port: 4173, proxy: { '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000', changeOrigin: false } } },
  test: { environment: 'jsdom', setupFiles: ['./test/setup.ts'], include: ['src/**/*.test.tsx', 'src/**/*.test.ts'], testTimeout: 20_000 },
});
