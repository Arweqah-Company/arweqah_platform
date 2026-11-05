import { CorePermission, type OrgTreeDto } from '@arweqah-platform/shared';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePermissions } from '@/core/permissions/can';
import { useListPage } from '@/shared/lib/use-list-page';
import { useViewMode } from '@/shared/lib/use-view-mode';
import { useOrgTree } from './api';

export type OrgView = 'chart' | 'icicle' | 'table' | 'cards';
export type OrgScope = 'team' | 'full';
export type UnitAction = 'edit' | 'mode' | 'code' | 'move' | 'delete';
/** The popup that is open: add a unit (under a unit or the group), the types window, or an action on one unit. */
export type OrgDialog = { kind: 'add'; parentId: string | null } | { kind: 'levels' } | { kind: 'unit'; action: UnitAction; nodeId: string } | null;

/**
 * A link may open the page with a unit selected: `?unit=<id>` (or `first`, the first top unit) and `?tab=<tab>`. The welcome tour uses it to
 * point at a tab of the details panel; it applies once, so closing the panel is never undone.
 */
function useOpenFromLink(tree: OrgTreeDto | undefined, open: (id: string, tab: string | null) => void) {
  const [params] = useSearchParams();
  const done = useRef(false);
  const wanted = params.get('unit');
  const tab = params.get('tab');
  useEffect(() => {
    if (done.current || !wanted || !tree) return;
    const target = wanted === 'first' ? tree.nodes.find((n) => !n.parentId) : tree.nodes.find((n) => n.id === wanted);
    done.current = true;
    if (target) open(target.id, tab);
  }, [wanted, tab, tree, open]);
}

/** The page's own state: which part of the structure is shown, the selected unit and its tab, the open popup, the search and the filters. */
export function useOrgPage() {
  const canFull = usePermissions().can(CorePermission.OrgViewFull);
  const [scope, setScope] = useState<OrgScope>('team');
  const [asCompany, setAsCompany] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState<OrgDialog>(null);
  const [view, setView] = useViewMode<OrgView>('org', { modes: ['chart', 'icicle', 'table', 'cards'], phoneDefault: 'table' });
  const list = useListPage('org-units');
  const full = canFull && scope === 'full';
  const compare = full && asCompany ? asCompany : undefined;
  const treeQuery = useOrgTree({ view: full ? 'full' : 'team', asCompany: compare });
  /** Forms pick their parent from every unit the person may see in full (the same request as the page when it already shows the full view). */
  const formsTree = useOrgTree({ view: canFull ? 'full' : 'team' }, treeQuery.isSuccess);
  useOpenFromLink(treeQuery.data, (id, wantedTab) => {
    setSelectedId(id);
    if (wantedTab) setTab(wantedTab);
  });
  const chooseScope = (next: OrgScope) => {
    setScope(next);
    if (next === 'team') setAsCompany('');
  };
  const showWithoutLeader = () => {
    list.filters.set({ ...list.filters.values, status: 'noleader' });
    setView('table');
  };
  return { canFull, scope: full ? 'full' : 'team', chooseScope, asCompany, setAsCompany, compare, selectedId, setSelectedId, tab, setTab, dialog, setDialog, view, setView, list, treeQuery, formsTree, showWithoutLeader } as const;
}

export type OrgPageState = ReturnType<typeof useOrgPage>;
