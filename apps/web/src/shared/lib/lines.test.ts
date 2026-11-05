import { describe, expect, it } from 'vitest';
import { linesOf, listProblem, pickLines, pickText, textOfLines, todayInRiyadh } from './lines';

describe('Lists written one item per line', () => {
  it('turns a text into items, trimming and dropping empty lines', () => {
    expect(linesOf(' أول \n\n  ثانٍ\n')).toEqual(['أول', 'ثانٍ']);
    expect(linesOf('')).toEqual([]);
  });

  it('writes the items back one per line', () => {
    expect(textOfLines(['a', 'b'])).toBe('a\nb');
  });

  it('shows the language of the reader and falls back to the other when it is empty', () => {
    const list = { ar: [], en: ['one'] };
    expect(pickLines(list, true)).toEqual(['one']);
    expect(pickLines({ ar: ['أول'], en: ['one'] }, true)).toEqual(['أول']);
    expect(pickText({ ar: '', en: 'Purpose' }, true)).toBe('Purpose');
    expect(pickText({ ar: 'الغرض', en: 'Purpose' }, false)).toBe('Purpose');
  });

  it('reports too many lines or a line that is too long', () => {
    const limits = { maxItems: 2, maxLength: 5 };
    expect(listProblem(['a', 'b'], limits)).toBeUndefined();
    expect(listProblem(['a', 'b', 'c'], limits)).toBe('tooMany');
    expect(listProblem(['abcdef'], limits)).toBe('tooLong');
  });

  it('gives today as an ISO date', () => {
    expect(todayInRiyadh()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
