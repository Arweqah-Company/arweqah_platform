import { describe, expect, it } from 'vitest';
import { isCsvText } from './csv-text';

describe('isCsvText (FR-09)', () => {
  it('accepts UTF-8 text named .csv, Arabic included, in any letter case', () => {
    expect(isCsvText('a.csv', Buffer.from('a,b\n1,2'))).toBe(true);
    expect(isCsvText('تقرير.CSV', Buffer.from('الاسم,العدد\nأحمد,3', 'utf8'))).toBe(true);
  });
  it('refuses another name, a NUL byte and bytes that are not UTF-8', () => {
    expect(isCsvText('a.txt', Buffer.from('a,b'))).toBe(false);
    expect(isCsvText('a.csv', Buffer.from([0x61, 0x00, 0x62]))).toBe(false);
    expect(isCsvText('a.csv', Buffer.from([0xc3, 0x28]))).toBe(false);
  });
});
