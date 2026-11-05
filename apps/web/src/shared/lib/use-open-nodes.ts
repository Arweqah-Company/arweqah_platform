import { useMemo, useState } from 'react';
import { childrenOf, initiallyClosed, matchesOf, type TreeNode } from './chart-tree';

/** Which nodes of a tree are open: toggle one, open or close all, and a search that opens the way to its matches. */
export function useOpenNodes(items: TreeNode[], rootId: string, query: string, openDepth: number) {
  const [closed, setClosed] = useState<Set<string>>(() => initiallyClosed(items, rootId, openDepth));
  const { hits, open: forced } = useMemo(() => matchesOf(items, query), [items, query]);
  return {
    hits,
    isOpen: (id: string) => forced.has(id) || !closed.has(id),
    toggle: (id: string) => setClosed((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; }),
    openAll: () => setClosed(new Set()),
    /** Closes every node but the root, so the way back is always one click away. */
    closeAll: () => setClosed(new Set(items.filter((i) => i.id !== rootId && childrenOf(items, i.id).length).map((i) => i.id))),
  };
}
