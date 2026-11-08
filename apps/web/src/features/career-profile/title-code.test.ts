import { describe, expect, it } from 'vitest';
import { splitTitleCode } from './title-code';

describe('splitTitleCode (FR-111)', () => {
  it('splits the unit slots, the grade and track, and the sequence', () => {
    expect(splitTitleCode('OPS.01.01.01-L9P-01')).toEqual({
      slots: [{ key: 'sector', value: 'OPS' }, { key: 'department', value: '01' }, { key: 'section', value: '01' }, { key: 'unit', value: '01' }],
      gradeTrack: 'L9P',
      sequence: '01',
    });
    expect(splitTitleCode('XXX.00.00.00-L1M-12')?.slots.map((s) => s.value)).toEqual(['XXX', '00', '00', '00']);
  });

  it('gives null for no code or one that is not shaped like a title code', () => {
    expect(splitTitleCode(null)).toBeNull();
    expect(splitTitleCode('OPS.01-L9P-01')).toBeNull();
    expect(splitTitleCode('OPS.01.01.01-L0P-01')).toBeNull();
  });
});
