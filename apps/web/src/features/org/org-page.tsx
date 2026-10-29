import { CorePermission, type OrgTreeDto } from '@arweqah-platform/shared';
import { AlignStartVertical, Network, Table2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { useViewMode } from '@/shared/lib/use-view-mode';
import { Alert, Button, EmptyState, PageHeader, Select, ViewSwitch } from '@/shared/ui';
import { useCompanyOptions, useOrgTree } from './api';
import { LevelsForm } from './levels-form';
import { NodeActionDialogs, type NodeAction } from './node-action-dialogs';
import { NodeDetails } from './node-details';
import { NodeForm } from './node-form';
import { OrgChartView } from './org-chart-view';
import { OrgTableView } from './org-table-view';
import { TitlesForm } from './titles-form';

type Form = 'levels' | 'node' | 'titles' | null;
type OrgView = 'chart' | 'icicle' | 'table';

function Toolbar({ ready, onLevels, onAddUnit, onAddTitle }: { ready: boolean; onLevels: () => void; onAddUnit: () => void; onAddTitle: () => void }) {
  const { t } = useTranslation('org');
  return (
    <>
      <Can permission={CorePermission.OrgLevelsManage}><Button data-tour="org-levels" variant="secondary" onClick={onLevels} disabled={!ready}>{t('actions.levels')}</Button></Can>
      <Can permission={CorePermission.OrgUnitCreate}><Button data-tour="org-add-unit" onClick={onAddUnit} disabled={!ready}>{t('actions.addUnit')}</Button></Can>
      <Can permission={CorePermission.OrgTitlesManage}><Button variant="secondary" onClick={onAddTitle} disabled={!ready}>{t('actions.addTitle')}</Button></Can>
    </>
  );
}

/** Which company is shown, how (chart or table), which unit is selected and which of the three forms is open. */
function useOrgPage() {
  const me = useMe().data;
  const companies = useCompanyOptions();
  const [chosen, setChosen] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [rowAction, setRowAction] = useState<{ nodeId: string; action: NodeAction } | null>(null);
  const [view, setView] = useViewMode<OrgView>('org', { modes: ['chart', 'icicle', 'table'], phoneDefault: 'table' });
  const companyId = chosen || me?.placement.companyId || companies.data?.[0]?.id || '';
  const treeQuery = useOrgTree(companyId || undefined);
  return {
    companies: companies.data ?? [], companyId, treeQuery, selectedId, setSelectedId, form, setForm, parentId, view, setView, rowAction, setRowAction,
    chooseCompany: (id: string) => { setChosen(id); setSelectedId(null); },
    openNode: (parent: string | null) => { setParentId(parent); setForm('node'); },
  };
}

type Page = ReturnType<typeof useOrgPage>;

/** The details of the selected unit beside the chart or table, with a way to close them. */
function DetailsPanel({ page, tree }: { page: Page; tree: OrgTreeDto }) {
  const { t: tc } = useTranslation();
  const node = tree.nodes.find((n) => n.id === page.selectedId);
  if (!node) return null;
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="absolute end-2 top-2 z-10" aria-label={tc('actions.close')} onClick={() => page.setSelectedId(null)}><X className="size-4" aria-hidden /></Button>
      <NodeDetails key={node.id} tree={tree} node={node} onAddTitles={() => page.setForm('titles')} onAddChild={() => page.openNode(node.id)} onDeleted={() => page.setSelectedId(null)} />
    </div>
  );
}

/** The popup of an action chosen on a unit's row (edit, move, delete). */
function RowDialogs({ page, tree }: { page: Page; tree: OrgTreeDto }) {
  const node = tree.nodes.find((n) => n.id === page.rowAction?.nodeId);
  if (!node || !page.rowAction) return null;
  return <NodeActionDialogs tree={tree} node={node} action={page.rowAction.action} onClose={() => page.setRowAction(null)} onDeleted={() => page.selectedId === node.id && page.setSelectedId(null)} />;
}

/** The structure (chart or table) with the selected unit's details, and whichever of the three forms is open. */
function OrgBody({ page, tree, companyName }: { page: Page; tree: OrgTreeDto; companyName: string }) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const close = (open: boolean) => !open && page.setForm(null);
  const empty = tree.nodes.length === 0;
  const selected = !!page.selectedId && tree.nodes.some((n) => n.id === page.selectedId);
  return (
    <>
      {empty ? (
        <>
          <EmptyState icon={Network} title={t('empty.title')} description={t('empty.description')} action={<Can permission={CorePermission.OrgUnitCreate}><Button onClick={() => page.openNode(null)}>{t('empty.action')}</Button></Can>} />
          <p className="mt-4 text-center text-sm text-muted">{t('empty.levels', { levels: tree.levels.map((l) => (ar ? l.nameAr : l.nameEn)).join(' › ') })}</p>
        </>
      ) : (
        <div className={selected ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]' : undefined}>
          <div className="min-w-0">
            {page.view !== 'table' ? <OrgChartView icicle={page.view === 'icicle'} tree={tree} companyName={companyName} selectedId={page.selectedId} onSelect={page.setSelectedId} /> : <OrgTableView tree={tree} selectedId={page.selectedId} onSelect={page.setSelectedId} onAction={(node, action) => page.setRowAction({ nodeId: node.id, action })} onAddChild={(node) => page.openNode(node.id)} />}
          </div>
          <DetailsPanel page={page} tree={tree} />
        </div>
      )}
      <RowDialogs page={page} tree={tree} />
      {page.form === 'levels' && <LevelsForm companyId={page.companyId} levels={tree.levels} open onOpenChange={close} />}
      {page.form === 'node' && <NodeForm tree={tree} initialParentId={page.parentId} open onOpenChange={close} />}
      {page.form === 'titles' && <TitlesForm tree={tree} initialNodeId={page.selectedId} open onOpenChange={close} />}
    </>
  );
}

/** The structure of one company as a chart or a table, with three forms to build it: levels, units, job titles. */
export function OrgPage() {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const page = useOrgPage();
  const tree = page.treeQuery.data;
  const company = page.companies.find((c) => c.id === page.companyId);

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Toolbar ready={!!tree} onLevels={() => page.setForm('levels')} onAddUnit={() => page.openNode(null)} onAddTitle={() => page.setForm('titles')} />} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select className="max-w-sm" aria-label={t('company')} value={page.companyId} onChange={(e) => page.chooseCompany(e.target.value)}>
          {page.companies.map((c) => <option key={c.id} value={c.id}>{ar ? c.nameAr : c.nameEn}</option>)}
        </Select>
        <ViewSwitch<OrgView> value={page.view} onChange={page.setView} choices={[{ id: 'chart', label: tc('view.chart'), icon: Network }, { id: 'icicle', label: tc('view.icicle'), icon: AlignStartVertical }, { id: 'table', label: tc('view.table'), icon: Table2 }]} />
      </div>
      {page.treeQuery.isError && <Alert>{errorMessage(tc, page.treeQuery.error)}</Alert>}
      {tree && <OrgBody page={page} tree={tree} companyName={company ? (ar ? company.nameAr : company.nameEn) : ''} />}
    </>
  );
}
