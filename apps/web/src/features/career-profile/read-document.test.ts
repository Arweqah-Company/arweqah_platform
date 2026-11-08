import { describe, expect, it } from 'vitest';
import { DocumentReadError, linesOf, readDocumentText } from './read-document';

const file = (content: string, name: string) => new File([content], name);

describe('reading a title file in the browser (FR-113)', () => {
  it('reads the text of a txt file', async () => {
    expect(await readDocumentText(file('ملخص الوظيفة\nنص', 'title.txt'))).toBe('ملخص الوظيفة\nنص');
  });

  it('refuses a type it cannot read, a file with no text, and a file that is not what its name says', async () => {
    await expect(readDocumentText(file('x', 'sheet.xlsx'))).rejects.toMatchObject({ reason: 'unsupported' });
    await expect(readDocumentText(file('   \n ', 'empty.txt'))).rejects.toMatchObject({ reason: 'empty' });
    await expect(readDocumentText(file('not a word document', 'broken.docx'))).rejects.toBeInstanceOf(DocumentReadError);
    await expect(readDocumentText(file('not a pdf', 'broken.pdf'))).rejects.toMatchObject({ reason: 'unreadable' });
  });

  it('puts the pieces of one PDF line together, one line per break', () => {
    const items = [{ str: 'ملخص ', transform: [], hasEOL: false }, { str: 'الوظيفة', transform: [], hasEOL: true }, { str: 'سطر ثان', transform: [], hasEOL: false }, { type: 'beginMarkedContent' }];
    expect(linesOf(items)).toBe('ملخص الوظيفة\nسطر ثان');
    expect(linesOf([])).toBe('');
  });
});
