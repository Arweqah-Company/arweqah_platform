import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FilesService } from '../../../../core/files/application/files.service';
import type { AiService } from '../../../../core/integrations/application/services/ai.service';
import { ProblemReportAnalyzer } from './problem-report-analyzer.service';

const CONTEXT = { pageTitle: 'التذاكر', path: '/tickets', language: 'ar' as const, theme: 'light' as const, viewport: '1280x720', browser: 'Chrome', appVersion: '', failedRequests: [], errors: [] };
const ANSWER = { value: { title: 'عنوان', summary: 'ملخص', stepsGuess: ['خطوة'], area: 'التذاكر', kind: 'bug' as const }, imagesSeen: false };

/** An AI service that takes `ms` to answer (a picture can take longer than ten seconds). */
function slowAi(ms: number): AiService {
  return { isActive: () => Promise.resolve(true), jsonOf: () => new Promise((resolve) => setTimeout(() => resolve(ANSWER), ms)) } as unknown as AiService;
}

describe('Reading a problem report with the AI (FR-197)', () => {
  afterEach(() => vi.useRealTimers());

  it('waits for a slow answer (a picture takes 10 to 20 seconds on some services) instead of giving up at 15 seconds', async () => {
    vi.useFakeTimers();
    const analyzer = new ProblemReportAnalyzer(slowAi(25_000), {} as FilesService);
    const pending = analyzer.analyze({ userId: 'u1', note: 'x', context: CONTEXT, imageFileId: null });
    await vi.advanceTimersByTimeAsync(25_000);
    expect(await pending).toMatchObject({ analysis: { title: 'عنوان' } });
  });

  it('still gives up when the AI never answers, and says nothing (the person writes by hand)', async () => {
    vi.useFakeTimers();
    const analyzer = new ProblemReportAnalyzer(slowAi(10 * 60_000), {} as FilesService);
    const pending = analyzer.analyze({ userId: 'u1', note: 'x', context: CONTEXT, imageFileId: null });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await pending).toBeNull();
  });
});
