/** What the problem report tests share: the details a screen reports about itself, and a screenshot. */
export const CONTEXT = { pageTitle: 'Tickets', path: '/tickets', language: 'ar' as const, theme: 'light' as const, viewport: '1280x720', browser: 'Chrome', appVersion: '', failedRequests: [], errors: [] };
export const SHOT = (): Blob => new Blob(['x'], { type: 'image/jpeg' });
