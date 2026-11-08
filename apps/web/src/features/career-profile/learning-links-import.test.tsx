import type { ImportLearningLinksInput, LearningImportResultDto } from '@arweqah-platform/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/msw';
import { useLearningLinksImport } from './learning-links-import';

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
const cells = (over: Record<string, string> = {}) => ({ titleCode: 'OPS.01.01.01-L9P-01', period: 'السنة 1', unit: 'أمان العمل', link: 'https://learn.example/u', ...over });

function serve(answer: (input: ImportLearningLinksInput) => LearningImportResultDto) {
  const sent: ImportLearningLinksInput[] = [];
  server.use(http.post('*/api/career/learning-links', async ({ request }) => {
    const body = (await request.json()) as ImportLearningLinksInput;
    sent.push(body);
    return HttpResponse.json(answer(body));
  }));
  return sent;
}
const result = (rows: LearningImportResultDto['rows'], dryRun = true): LearningImportResultDto => ({ dryRun, updated: rows.filter((r) => r.status === 'updated').length, unchanged: 0, rejected: rows.filter((r) => r.status === 'rejected').length, rows });

describe('Importing the learning links from a file (FR-113)', () => {
  it('has the four columns of the sheet, the three that find the unit required', () => {
    const { result: hook } = renderHook(() => useLearningLinksImport(), { wrapper });
    expect(hook.current.columns.map((c) => [c.id, !!c.required])).toEqual([['titleCode', true], ['period', true], ['unit', true], ['link', false]]);
  });

  it('reports a row with a missing cell or a link that is not https without asking the server, and sends only the valid ones', async () => {
    const sent = serve((input) => result(input.rows.map((_, i) => ({ row: i + 1, status: 'updated' as const, reason: null }))));
    const { result: hook } = renderHook(() => useLearningLinksImport(), { wrapper });
    const prepared = await hook.current.prepare([
      { rowNumber: 2, cells: cells() },
      { rowNumber: 3, cells: cells({ unit: '' }) },
      { rowNumber: 4, cells: cells({ link: 'http://insecure.example' }) },
    ]);
    expect(prepared.map((p) => [p.rowNumber, p.errors.length > 0])).toEqual([[2, false], [3, true], [4, true]]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ rows: [{ titleCode: 'OPS.01.01.01-L9P-01', period: 'السنة 1', unit: 'أمان العمل', link: 'https://learn.example/u' }], dryRun: true });
    await waitFor(() => expect(hook.current.previewNote).toContain('1 وحدة سيتغير رابطها'));
  });

  it('shows the reason the server gave for a row, with the row\'s number in the sheet', async () => {
    serve(() => result([{ row: 1, status: 'rejected', reason: 'unit_not_found' }, { row: 2, status: 'updated', reason: null }]));
    const { result: hook } = renderHook(() => useLearningLinksImport(), { wrapper });
    const prepared = await hook.current.prepare([{ rowNumber: 5, cells: cells({ unit: 'لا وحدة' }) }, { rowNumber: 6, cells: cells() }]);
    expect(prepared.find((p) => p.rowNumber === 5)?.errors).toEqual(['لا وحدة بهذا الاسم في الفترة']);
    expect(prepared.find((p) => p.rowNumber === 6)?.errors).toEqual([]);
  });

  it('imports the whole sheet in one call and reports only what the server still refused among the rows it had accepted', async () => {
    const sent = serve((input) => result(input.dryRun ? [{ row: 1, status: 'updated', reason: null }, { row: 2, status: 'updated', reason: null }] : [{ row: 1, status: 'updated', reason: null }, { row: 2, status: 'rejected', reason: 'content_changed' }], input.dryRun));
    const { result: hook } = renderHook(() => useLearningLinksImport(), { wrapper });
    const prepared = await hook.current.prepare([{ rowNumber: 2, cells: cells() }, { rowNumber: 3, cells: cells({ unit: 'ثانية' }) }]);
    const failures = await hook.current.commit(prepared.filter((p) => p.run));
    expect(sent.map((s) => s.dryRun)).toEqual([true, false]);
    expect(failures).toEqual([{ rowNumber: 3, message: 'تغيّر محتوى المسمى أثناء الاستيراد: أعد الاستيراد' }]);
  });
});
