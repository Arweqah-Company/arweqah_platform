export interface TreeNode {
  id: string;
  /** Null for the root. */
  parentId: string | null;
  title: string;
  /** More words a search matches besides the title (a code, the names of titles). */
  searchText?: string;
}

export function childrenOf<T extends TreeNode>(items: T[], id: string): T[] {
  return items.filter((i) => i.parentId === id);
}

export function descendantCount(items: TreeNode[], id: string): number {
  return childrenOf(items, id).reduce((sum, child) => sum + 1 + descendantCount(items, child.id), 0);
}

/** Ids of the nodes that have children and are not open at the start (deeper than `openDepth`). */
export function initiallyClosed(items: TreeNode[], rootId: string, openDepth: number): Set<string> {
  const closed = new Set<string>();
  const walk = (id: string, depth: number) => {
    const kids = childrenOf(items, id);
    if (kids.length && depth >= openDepth) closed.add(id);
    kids.forEach((k) => walk(k.id, depth + 1));
  };
  walk(rootId, 0);
  return closed;
}

/** Items matching the query and every ancestor of a match (those must be open to show it). */
export function matchesOf(items: TreeNode[], query: string): { hits: Set<string>; open: Set<string> } {
  const hits = new Set<string>();
  const open = new Set<string>();
  const needle = query.trim().toLowerCase();
  if (!needle) return { hits, open };
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const item of items.filter((i) => `${i.title} ${i.searchText ?? ''}`.toLowerCase().includes(needle) && i.parentId !== null)) {
    hits.add(item.id);
    for (let p = byId.get(item.parentId ?? ''); p; p = byId.get(p.parentId ?? '')) open.add(p.id);
  }
  return { hits, open };
}
