import { describe, expect, it } from 'vitest';
import { partitionLayout } from './partition-layout';

const items = [
  { id: 'root', parentId: null },
  { id: 'a', parentId: 'root' },
  { id: 'b', parentId: 'root' },
  { id: 'a1', parentId: 'a' },
  { id: 'a2', parentId: 'a' },
  { id: 'a3', parentId: 'a' },
];

describe('Partition layout', () => {
  const { slices, levels, leaves } = partitionLayout(items);
  const at = (id: string) => slices.find((p) => p.id === id)!;

  it('gives the root the whole width and every level its own row', () => {
    expect(at('root')).toMatchObject({ depth: 0, from: 0, to: 1 });
    expect(at('a').depth).toBe(1);
    expect(at('a2').depth).toBe(2);
    expect(levels).toBe(3);
    expect(leaves).toBe(4);
  });

  it('shares the width by the leaves below each branch', () => {
    // a has 3 leaves and b has 1: a takes three quarters of the width, b the last quarter.
    expect(at('a').to - at('a').from).toBeCloseTo(0.75);
    expect(at('b').from).toBeCloseTo(0.75);
    expect(at('b').to).toBeCloseTo(1);
  });

  it('keeps the children inside the slice of their parent, side by side in order', () => {
    expect(at('a1').from).toBeCloseTo(at('a').from);
    expect(at('a3').to).toBeCloseTo(at('a').to);
    expect(at('a2').from).toBeCloseTo(at('a1').to);
  });

  it('handles a lone root and no items', () => {
    expect(partitionLayout([{ id: 'r', parentId: null }]).levels).toBe(1);
    expect(partitionLayout([]).slices).toEqual([]);
  });
});
