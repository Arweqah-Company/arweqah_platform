import { describe, expect, it } from 'vitest';
import { isValidCodePrefix } from '@arweqah-platform/shared';
import { ORG_STRUCTURE, type OrgSeedNode } from './org-structure.data';

const all = (nodes: OrgSeedNode[]): OrgSeedNode[] => nodes.flatMap((n) => [n, ...all(n.children)]);

describe('the owner\'s organization structure file (docs/organizational_structure.md)', () => {
  const nodes = all(ORG_STRUCTURE);

  it('has the 64 units of the sheet', () => {
    expect(nodes).toHaveLength(64);
  });

  it('has the 270 job titles of the file, each with a grade 1-9 and a track', () => {
    const titles = nodes.flatMap((n) => n.titles);
    expect(titles).toHaveLength(270);
    expect(titles.every((t) => t.grade >= 1 && t.grade <= 9 && 'MPJCS'.includes(t.track) && t.ar && t.en)).toBe(true);
  });

  it('gives every top unit its own valid three-letter prefix and nobody else one', () => {
    const prefixes = ORG_STRUCTURE.map((n) => n.prefix as string);
    expect(prefixes).toEqual(['GRW', 'OPS', 'BUS', 'COM', 'STR', 'EXE']);
    expect(prefixes.every(isValidCodePrefix)).toBe(true);
    expect(nodes.filter((n) => !ORG_STRUCTURE.includes(n)).some((n) => n.prefix)).toBe(false);
  });

  it('keeps a sector free of titles and gives every unit with nothing below it its titles', () => {
    expect(nodes.filter((n) => n.kind === 'sector').every((n) => n.titles.length === 0)).toBe(true);
    expect(nodes.filter((n) => n.children.length === 0).every((n) => n.titles.length > 0)).toBe(true);
  });

  it('has no placeholder unit named «direct» (the file\'s «no unit» line) and no doubled «إدارة إدارة»', () => {
    expect(nodes.some((n) => n.ar === 'مباشر' || n.ar.includes('إدارة إدارة'))).toBe(false);
  });

  it('follows the sheet of 2026-11-11: team leads and coordinators in every unit, the consultant track, and no supervisor / lead of grade 6 track S', () => {
    const titles = nodes.flatMap((n) => n.titles);
    expect(titles.some((t) => t.ar === 'منسق الربط والوصول للسوق' && t.grade === 9 && t.track === 'P')).toBe(true);
    expect(titles.filter((t) => t.track === 'S' && t.grade === 6)).toHaveLength(0);
    expect(titles.filter((t) => t.track === 'C')).toHaveLength(20);
    expect(nodes.some((n) => n.ar === 'وحدة الربط والوصول للسوق' && n.titles.length === 5)).toBe(true);
  });
});
