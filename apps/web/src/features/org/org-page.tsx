import { CorePermission, type OrgTreeDto } from '@arweqah-platform/shared';
import { Network } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Can, usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, EmptyState, PageHeader } from '@/shared/ui';
import { OrgAlerts } from './org-alerts';
import { OrgChartView } from './org-chart-view';
import { OrgDialogs } from './org-dialogs';
import { buildModel, type OrgModel } from './org-model';
import { OrgTableView } from './org-table-view';
import { OrgToolbar } from './org-toolbar';
import { UnitDetails } from './unit-details';
import { useOrgPage, type OrgPageState } from './use-org-page';

/** «Division of the structure» and «add unit», each only with its key and while admin mode is on. */
function HeaderActions({ page }: { page: OrgPageState }) {
  const { t } = useTranslation('org');
  return (
    <>
      <Can adminMode permission={CorePermission.OrgLevelsManage}><Button data-tour="org-levels" variant="secondary" onClick={() => page.setDialog({ kind: 'levels' })}>{t('actions.levels')}</Button></Can>
      <Can adminMode permission={CorePermission.OrgUnitCreate}><Button data-tour="org-add-unit" onClick={() => page.setDialog({ kind: 'add', parentId: null })}>{t('actions.addUnit')}</Button></Can>
    </>
  );
}

/** One of the four views of the structure. A chart is remounted when the part shown changes, so it starts closed again. */
function Views({ page, tree, model }: { page: OrgPageState; tree: OrgTreeDto; model: OrgModel }) {
  const cards = page.view === 'cards';
  if (page.view === 'table' || cards) return <OrgTableView page={page} tree={tree} model={model} cards={cards} />;
  return <OrgChartView key={`${page.scope}-${page.compare ?? ''}`} model={model} selectedId={page.selectedId} onSelect={page.setSelectedId} icicle={page.view === 'icicle'} query={page.list.term} />;
}

/** The units of the structure in the chosen view, with the selected unit's details beside them (below on a narrow screen). */
function OrgBody({ page, tree }: { page: OrgPageState; tree: OrgTreeDto }) {
  const { t } = useTranslation('org');
  const model = useMemo(() => buildModel(tree, page.list.term, page.list.filters.values, page.compare), [tree, page.list.term, page.list.filters.values, page.compare]);
  const selected = page.selectedId ? model.byId.get(page.selectedId) : undefined;
  return (
    <>
      <OrgAlerts page={page} tree={tree} model={model} />
      <OrgToolbar page={page} tree={tree} model={model} />
      {tree.nodes.length === 0 ? (
        <EmptyState icon={Network} title={t(page.scope === 'full' ? 'empty.fullTitle' : 'empty.teamTitle')} description={t(page.scope === 'full' ? 'empty.fullBody' : 'empty.teamBody')} action={<Can adminMode permission={CorePermission.OrgUnitCreate}><Button onClick={() => page.setDialog({ kind: 'add', parentId: null })}>{t('empty.action')}</Button></Can>} />
      ) : (
        <div className={selected ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]' : undefined}>
          <div className="min-w-0"><Views page={page} tree={tree} model={model} /></div>
          {selected && <UnitDetails ctx={{ page, tree, model, node: selected }} />}
        </div>
      )}
      <OrgDialogs page={page} tree={tree} />
    </>
  );
}

/** The structure of the whole group: one tree, shown as a chart, an icicle, a table or cards; what a person sees depends on who they are. */
export function OrgPage() {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const page = useOrgPage();
  const tree = page.treeQuery.data;
  const canFull = usePermissions().can(CorePermission.OrgViewFull);
  return (
    <>
      <PageHeader title={t('title')} description={t(canFull ? 'description.full' : 'description.team')} actions={<HeaderActions page={page} />} />
      {page.treeQuery.isError && <Alert>{errorMessage(tc, page.treeQuery.error)}</Alert>}
      {page.treeQuery.isLoading && <div role="status" className="h-24 animate-pulse rounded-2xl bg-neutral-50" />}
      {tree && <OrgBody page={page} tree={tree} />}
    </>
  );
}
