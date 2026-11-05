import { describe, expect, it } from 'vitest';
import { buildTitleCode, nextUnitCode, parseTitleCode, rootLevelCode, slotFor } from './org-codes.rules';

describe('unit codes by type (FR-96)', () => {
  it('builds a department under a sector in the department slot', () => {
    expect(nextUnitCode({ parentCode: 'GRW.00.00.00', parentType: 'sector', childType: 'department', siblingCodes: ['GRW.01.00.00', 'GRW.02.00.00'] })).toBe('GRW.03.00.00');
  });

  it('puts a section directly under a sector in the section slot, leaving the department slot at zero', () => {
    expect(nextUnitCode({ parentCode: 'BUS.00.00.00', parentType: 'sector', childType: 'section', siblingCodes: [] })).toBe('BUS.00.01.00');
    expect(nextUnitCode({ parentCode: 'BUS.00.00.00', parentType: 'sector', childType: 'section', siblingCodes: ['BUS.00.01.00'] })).toBe('BUS.00.02.00');
  });

  it('builds a section under a department and a unit under a section', () => {
    expect(nextUnitCode({ parentCode: 'OPS.02.00.00', parentType: 'department', childType: 'section', siblingCodes: ['OPS.02.01.00'] })).toBe('OPS.02.02.00');
    expect(nextUnitCode({ parentCode: 'OPS.03.03.00', parentType: 'section', childType: 'unit', siblingCodes: [] })).toBe('OPS.03.03.01');
  });

  it('gives an office the number 09 in the slot where it sits', () => {
    expect(nextUnitCode({ parentCode: 'OPS.00.00.00', parentType: 'sector', childType: 'office', siblingCodes: ['OPS.02.00.00'] })).toBe('OPS.09.00.00');
    expect(nextUnitCode({ parentCode: 'OPS.03.00.00', parentType: 'department', childType: 'office', siblingCodes: [] })).toBe('OPS.03.09.00');
    expect(nextUnitCode({ parentCode: 'OPS.03.03.00', parentType: 'section', childType: 'office', siblingCodes: [] })).toBe('OPS.03.03.09');
  });

  it('takes the next free number below 09 for a second office, and skips 09 for ordinary units', () => {
    expect(nextUnitCode({ parentCode: 'OPS.00.00.00', parentType: 'sector', childType: 'office', siblingCodes: ['OPS.09.00.00'] })).toBe('OPS.08.00.00');
    const eight = Array.from({ length: 8 }, (_, i) => `OPS.0${i + 1}.00.00`);
    expect(nextUnitCode({ parentCode: 'OPS.00.00.00', parentType: 'sector', childType: 'department', siblingCodes: eight })).toBe('OPS.10.00.00');
  });

  it('refuses when the slot is taken by the parent or an ancestor, or a level below is already filled', () => {
    expect(nextUnitCode({ parentCode: 'OPS.02.00.00', parentType: 'department', childType: 'department', siblingCodes: [] })).toBeNull();
    expect(nextUnitCode({ parentCode: 'OPS.03.03.01', parentType: 'unit', childType: 'unit', siblingCodes: [] })).toBeNull();
    expect(nextUnitCode({ parentCode: 'OPS.03.03.00', parentType: 'section', childType: 'office', siblingCodes: ['OPS.03.03.01'] })).toBe('OPS.03.03.09');
    expect(nextUnitCode({ parentCode: 'OPS.03.03.01', parentType: 'unit', childType: 'office', siblingCodes: [] })).toBeNull();
    expect(nextUnitCode({ parentCode: 'bad', parentType: 'sector', childType: 'department', siblingCodes: [] })).toBeNull();
  });

  it('gives an added type the unit slot', () => {
    expect(slotFor('section', 'branch')).toBe(3);
    expect(nextUnitCode({ parentCode: 'OPS.03.03.00', parentType: 'section', childType: 'branch', siblingCodes: ['OPS.03.03.01'] })).toBe('OPS.03.03.02');
  });

  it('builds the code of a sector or of a department or office under the root from a three-letter prefix', () => {
    expect(rootLevelCode('COM')).toBe('COM.00.00.00');
    expect(rootLevelCode('com')).toBeNull();
    expect(rootLevelCode('COMM')).toBeNull();
  });
});

describe('job title codes', () => {
  it('reads and rebuilds a title code', () => {
    expect(parseTitleCode('OPS.03.03.01-L7P-01')).toEqual({ unitCode: 'OPS.03.03.01', grade: 7, track: 'P', sequence: 1 });
    expect(buildTitleCode('OPS.03.03.01', 7, 'P', 1)).toBe('OPS.03.03.01-L7P-01');
  });

  it('rejects a grade outside 1–9, an unknown track and a malformed code', () => {
    expect(parseTitleCode('OPS.03.03.01-L0P-01')).toBeNull();
    expect(parseTitleCode('OPS.03.03.01-L7X-01')).toBeNull();
    expect(parseTitleCode('OPS.03.03.01-L7P')).toBeNull();
  });
});
