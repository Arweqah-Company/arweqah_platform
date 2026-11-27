import JSZip from 'jszip';
import writeXlsxFile from 'write-excel-file/universal';
import { describe, expect, it, vi } from 'vitest';

vi.mock('mammoth/mammoth.browser', () => ({
  convertToHtml: async () => ({
    value: '<h1>تقرير</h1><p onclick="steal()">نص <a href="javascript:steal()">رابط</a> <a href="https://example.com">آمن</a></p><script>steal()</script><img src="x" onerror="steal()"><style>body{display:none}</style><table><tr><td>خلية</td></tr></table>',
    messages: [],
  }),
}));

import { csvToSheets, decodeCsv, docxToFragment, PREVIEW_MAX_ROWS, PREVIEW_MAX_SLIDES, pptxToSlides, xlsxToSheets } from './office-preview';

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

  it('reads a CSV in the encodings Excel writes (UTF-8, Windows-1256, UTF-16) and draws it as one sheet of text (CSV preview)', async () => {
    const utf8 = new TextEncoder().encode('الاسم,العدد\nأحمد,3\n');
    expect(decodeCsv(utf8.buffer as ArrayBuffer)).toBe('الاسم,العدد\nأحمد,3\n');
    const ansi = new Uint8Array([0xc7, 0xe1, 0xc7, 0xd3, 0xe3, 0x2c, 0x33]); // «الاسم,3» in Windows-1256: not valid UTF-8
    expect(decodeCsv(ansi.buffer)).toBe('الاسم,3');
    const utf16 = new Uint8Array([0xff, 0xfe, 0x61, 0x00]);
    expect(decodeCsv(utf16.buffer)).toContain('a');
    const [sheet] = await csvToSheets(new Blob(['الاسم;العدد\r\nأحمد;=1+1\r\n\r\n']));
    expect(sheet).toMatchObject({ truncated: false, rows: [['الاسم', 'العدد'], ['أحمد', '=1+1']] }); // a formula stays text; the blank line is dropped
    const many = Array.from({ length: PREVIEW_MAX_ROWS + 3 }, (_, i) => `r${i},${i}`).join('\n');
    const [big] = await csvToSheets(new Blob([many]));
    expect(big!.rows).toHaveLength(PREVIEW_MAX_ROWS);
    expect(big!.truncated).toBe(true);
  });
});

const SLIDE = (lines: string[]) => `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree>${lines.map((l) => `<p:sp><p:txBody><a:p><a:r><a:t>${l}</a:t></a:r></a:p></p:txBody></p:sp>`).join('')}</p:spTree></p:cSld></p:sld>`;
const RELS = (targets: string[]) => `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets.map((t, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${t}"/>`).join('')}</Relationships>`;

async function deck(slides: { lines: string[]; images?: string[] }[]): Promise<Blob> {
  const zip = new JSZip();
  slides.forEach((slide, i) => {
    zip.file(`ppt/slides/slide${i + 1}.xml`, SLIDE(slide.lines));
    if (slide.images) zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, RELS(slide.images.map((n) => `../media/${n}`)));
  });
  zip.file('ppt/media/logo.png', new Uint8Array([137, 80, 78, 71]));
  zip.file('ppt/media/drawing.svg', '<svg onload="steal()"/>');
  return zip.generateAsync({ type: 'blob' });
}

describe('PowerPoint preview in the browser (FR-191)', () => {
  it('reads the slides in order with their text, the title first, and only the pictures a browser may show (never SVG)', async () => {
    const { slides, truncated } = await pptxToSlides(await deck([{ lines: ['العرض الأول', 'نقطة أولى'] }, { lines: ['Second'], images: ['logo.png', 'drawing.svg'] }]));
    expect(truncated).toBe(false);
    expect(slides.map((s) => s.number)).toEqual([1, 2]);
    expect(slides[0]?.lines).toEqual(['العرض الأول', 'نقطة أولى']);
    expect(slides[1]?.images).toHaveLength(1);
    expect(slides[1]?.images[0]?.type).toBe('image/png');
  });

  it('shows markup in a slide as text, never as a page, and says when slides are left out', async () => {
    const many = Array.from({ length: PREVIEW_MAX_SLIDES + 3 }, (_, i) => ({ lines: [i === 0 ? '&lt;img src=x onerror=steal()&gt;' : `شريحة ${i}`] }));
    const { slides, truncated } = await pptxToSlides(await deck(many));
    expect(slides[0]?.lines[0]).toBe('<img src=x onerror=steal()>'); // the text of the slide, kept as text
    expect(slides).toHaveLength(PREVIEW_MAX_SLIDES);
    expect(truncated).toBe(true);
  });

  it('gives no slides for a file without any, and refuses what is not a zip', async () => {
    expect((await pptxToSlides(await deck([]))).slides).toEqual([]);
    await expect(pptxToSlides(new Blob(['not a zip']))).rejects.toThrow();
  });

  it('puts the slides in the order of the presentation, not of the file names (PowerPoint keeps the names when slides are moved)', async () => {
    const zip = new JSZip();
    zip.file('ppt/slides/slide1.xml', SLIDE(['first file, shown second']));
    zip.file('ppt/slides/slide2.xml', SLIDE(['second file, shown first']));
    zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="257" r:id="rId9"/><p:sldId id="256" r:id="rId8"/></p:sldIdLst></p:presentation>');
    zip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="rId8" Type="x/slide" Target="slides/slide1.xml"/><Relationship Id="rId9" Type="x/slide" Target="slides/slide2.xml"/></Relationships>');
    const { slides } = await pptxToSlides(await zip.generateAsync({ type: 'blob' }));
    expect(slides.map((s) => s.lines[0])).toEqual(['second file, shown first', 'first file, shown second']);
    expect(slides.map((s) => s.number)).toEqual([1, 2]);
  });

  const NS = { p: 'http://schemas.openxmlformats.org/presentationml/2006/main', r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', rel: 'http://schemas.openxmlformats.org/package/2006/relationships' };
  async function reordered(presentation: string, rels: string): Promise<string[]> {
    const zip = new JSZip();
    zip.file('ppt/slides/slide1.xml', SLIDE(['first file']));
    zip.file('ppt/slides/slide2.xml', SLIDE(['second file']));
    zip.file('ppt/presentation.xml', presentation);
    zip.file('ppt/_rels/presentation.xml.rels', rels);
    return (await pptxToSlides(await zip.generateAsync({ type: 'blob' }))).slides.map((x) => x.lines[0] ?? '');
  }

  it('reads a relationship that names its slide from the root of the package (a path starting with «/»)', async () => {
    const order = await reordered(
      `<p:presentation xmlns:p="${NS.p}" xmlns:r="${NS.r}"><p:sldIdLst><p:sldId id="257" r:id="rId9"/><p:sldId id="256" r:id="rId8"/></p:sldIdLst></p:presentation>`,
      `<Relationships xmlns="${NS.rel}"><Relationship Id="rId8" Type="x/slide" Target="/ppt/slides/slide1.xml"/><Relationship Id="rId9" Type="x/slide" Target="/ppt/slides/slide2.xml"/></Relationships>`,
    );
    expect(order).toEqual(['second file', 'first file']);
  });

  it('reads the presentation whatever prefixes it gives to the namespaces (not only «p» and «r»)', async () => {
    const order = await reordered(
      `<s:presentation xmlns:s="${NS.p}" xmlns:q="${NS.r}"><s:sldIdLst><s:sldId id="257" q:id="rId9"/><s:sldId id="256" q:id="rId8"/></s:sldIdLst></s:presentation>`,
      `<Relationships xmlns="${NS.rel}"><Relationship Id="rId8" Type="x/slide" Target="slides/slide1.xml"/><Relationship Id="rId9" Type="x/slide" Target="slides/slide2.xml"/></Relationships>`,
    );
    expect(order).toEqual(['second file', 'first file']);
  });
});
