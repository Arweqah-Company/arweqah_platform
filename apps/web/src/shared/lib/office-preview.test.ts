import writeXlsxFile from 'write-excel-file/universal';
import { describe, expect, it, vi } from 'vitest';

vi.mock('mammoth/mammoth.browser', () => ({
  convertToHtml: async () => ({
    value: '<h1>تقرير</h1><p onclick="steal()">نص <a href="javascript:steal()">رابط</a> <a href="https://example.com">آمن</a></p><script>steal()</script><img src="x" onerror="steal()"><style>body{display:none}</style><table><tr><td>خلية</td></tr></table>',
    messages: [],
  }),
}));

import { docxToFragment, PREVIEW_MAX_ROWS, xlsxToSheets } from './office-preview';

const html = (fragment: DocumentFragment) => Array.from(fragment.childNodes).map((n) => (n as Element).outerHTML ?? n.textContent).join('');

describe('Word and Excel preview in the browser (FR-128)', () => {
  it('turns a Word file into a page with its headings and tables, without scripts, handlers, styles or javascript: links', async () => {
    const out = html(await docxToFragment(new Blob(['x'])));
    expect(out).toContain('<h1>تقرير</h1>');
    expect(out).toContain('<td>خلية</td>');
    expect(out).not.toMatch(/<script|onclick|onerror|<style|javascript:/i);
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it('reads every sheet as text, showing a formula as the text it is, and says when rows are left out', async () => {
    const rows = Array.from({ length: PREVIEW_MAX_ROWS + 5 }, (_, i) => [`صف ${i}`, i]);
    const blob = await writeXlsxFile([[{ value: 'الاسم' }, { value: 'العدد' }], ...rows], { sheet: 'الأولى' }).toBlob();
    const [sheet] = await xlsxToSheets(blob);
    expect(sheet).toMatchObject({ name: 'الأولى', truncated: true });
    expect(sheet!.rows).toHaveLength(PREVIEW_MAX_ROWS);
    expect(sheet!.rows[0]).toEqual(['الاسم', 'العدد']);
    expect(sheet!.rows[1]).toEqual(['صف 0', '0']);
    const formula = await writeXlsxFile([[{ value: '=1+1' }]], { sheet: 'S' }).toBlob();
    expect((await xlsxToSheets(formula))[0]!.rows).toEqual([['=1+1']]);
  });
});
