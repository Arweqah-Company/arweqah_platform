export interface PartitionInput {
  id: string;
  /** Null for the root. */
  parentId: string | null;
}

export interface PartitionSlice {
  id: string;
  /** Level number (the root is 0). */
  depth: number;
  /** Where the slice starts and ends along its level, as shares of the whole (0 to 1). */
  from: number;
  to: number;
}

export interface PartitionLayout {
  slices: PartitionSlice[];
  /** Number of levels, the root's included. */
  levels: number;
  /** How many leaves the whole tree has (a drawing that gives each leaf the same room multiplies by this). */
  leaves: number;
}

/**
 * The partition of a tree along one axis, the base of the icicle: the root takes the whole width, each level is a row below it,
 * and every unit takes a part of its parent's part shared out by the number of leaves below each child.
 */
export function partitionLayout(items: PartitionInput[]): PartitionLayout {
  const children = new Map<string | null, string[]>();
  for (const item of items) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item.id]);
  const leaves = new Map<string, number>();
  const countLeaves = (id: string): number => {
    const below = children.get(id) ?? [];
    const n = below.length === 0 ? 1 : below.reduce((sum, child) => sum + countLeaves(child), 0);
    leaves.set(id, n);
    return n;
  };
  const slices: PartitionSlice[] = [];
  const place = (id: string, depth: number, from: number, to: number): void => {
    slices.push({ id, depth, from, to });
    const below = children.get(id) ?? [];
    const total = below.reduce((sum, child) => sum + (leaves.get(child) ?? 1), 0);
    let start = from;
    for (const child of below) {
      const span = ((to - from) * (leaves.get(child) ?? 1)) / total;
      place(child, depth + 1, start, start + span);
      start += span;
    }
  };
  let total = 0;
  for (const root of children.get(null) ?? []) {
    total += countLeaves(root);
    place(root, 0, 0, 1);
  }
  return { slices, leaves: total, levels: Math.max(0, ...slices.map((p) => p.depth)) + 1 };
}
