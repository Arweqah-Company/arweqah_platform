import { describe, expect, it } from 'vitest';
import { isCsvText } from './csv-text';

describe('isCsvText (FR-09)', () => {
  it('accepts text named .csv in any letter case: UTF-8 (Arabic, with a mark), Windows-1256 «ANSI» and UTF-16', () => {
    expect(isCsvText('a.csv', Buffer.from('a,b\n1,2'))).toBe(true);
    expect(isCsvText('تقرير.CSV', Buffer.from('الاسم,العدد\nأحمد,3', 'utf8'))).toBe(true);
    expect(isCsvText('a.csv', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('a;b\r\n1;2', 'utf8')]))).toBe(true);
    expect(isCsvText('a.csv', Buffer.from([0xc7, 0xe1, 0xc7, 0xd3, 0xe3, 0x2c, 0x33, 0x0d, 0x0a]))).toBe(true); // «الاسم,3» saved as Windows-1256
    expect(isCsvText('a.csv', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('a\tb\n', 'utf16le')]))).toBe(true);
  });
  it('refuses another name, an empty file, and a binary file renamed .csv (NUL or control bytes)', () => {
    expect(isCsvText('a.txt', Buffer.from('a,b'))).toBe(false);
    expect(isCsvText('a.csv', Buffer.alloc(0))).toBe(false);
    expect(isCsvText('a.csv', Buffer.from([0x61, 0x00, 0x62]))).toBe(false);
    expect(isCsvText('a.csv', Buffer.from([0x4d, 0x5a, 0x90, 0x03, 0x01]))).toBe(false);
  });
});
