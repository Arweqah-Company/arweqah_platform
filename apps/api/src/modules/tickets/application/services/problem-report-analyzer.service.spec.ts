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
    await vi.advanceTimersByTimeAsync(61_000);
    expect(await pending).toBeNull();
  });
});

describe('A reading that fails with the screenshot is tried again without it (FR-197)', () => {
  const files = { getOwned: () => Promise.resolve({ contentType: 'image/png' }), readBytes: () => Promise.resolve(Buffer.from('x')) } as unknown as FilesService;

  it('gives the text-only answer when the try with the picture fails', async () => {
    const calls: unknown[] = [];
    const ai = {
      isActive: () => Promise.resolve(true),
      jsonOf: (q: { images?: unknown[] }) => {
        calls.push(q.images);
        return q.images ? Promise.reject(new Error('The answer was longer than the limit')) : Promise.resolve(ANSWER);
      },
    } as unknown as AiService;
    const result = await new ProblemReportAnalyzer(ai, files).analyze({ userId: 'u1', note: 'x', context: CONTEXT, imageFileId: 'f1' });
    expect(result).toMatchObject({ analysis: { title: 'عنوان' } });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBeUndefined();
  });

  it('puts a model answer with a seventh step and an unknown kind into shape', async () => {
    const raw = { title: 't', summary: 's', stepsGuess: ['1', '2', '3', '4', '5', '6', '7'], area: 'a', kind: 'weird' };
    const ai = {
      isActive: () => Promise.resolve(true),
      jsonOf: (q: { normalize: (r: unknown) => unknown; schema: { parse: (v: unknown) => unknown } }) => Promise.resolve({ value: q.schema.parse(q.normalize(raw)), imagesSeen: false }),
    } as unknown as AiService;
    const result = await new ProblemReportAnalyzer(ai, files).analyze({ userId: 'u1', note: 'x', context: CONTEXT, imageFileId: null });
    expect(result?.analysis.stepsGuess).toHaveLength(6);
    expect(result?.analysis.kind).toBe('other');
  });
});
