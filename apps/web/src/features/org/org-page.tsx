import { CorePermission, type OrgTreeDto } from '@arweqah-platform/shared';
import { Network } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, EmptyState, PageHeader, Select, TreeView } from '@/shared/ui';
import { useCompanyOptions, useOrgTree } from './api';
import { LevelsForm } from './levels-form';
import { NodeDetails } from './node-details';
import { NodeForm } from './node-form';
import { TitlesForm } from './titles-form';

type Form = 'levels' | 'node' | 'titles' | null;

function TreePanel({ tree, selectedId, onSelect, onAddTitles, onAddChild }: { tree: OrgTreeDto; selectedId: string | null; onSelect: (id: string | null) => void; onAddTitles: () => void; onAddChild: (parentId: string) => void }) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const selected = tree.nodes.find((n) => n.id === selectedId);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-3">
        <TreeView
          label={t('title')}
          selectedId={selectedId}
          onSelect={onSelect}
          items={tree.nodes.map((n) => ({ id: n.id, parentId: n.parentId, label: ar ? n.nameAr : n.nameEn, hint: n.employeesCount ? String(n.employeesCount) : undefined }))}
        />
      </div>
      {selected ? (
        <NodeDetails key={selected.id} tree={tree} node={selected} onAddTitles={onAddTitles} onAddChild={() => onAddChild(selected.id)} onDeleted={() => onSelect(null)} />
      ) : (
        <p className="rounded-[var(--radius-panel)] border border-dashed border-neutral-700 p-6 text-sm text-muted">{t('selectUnit')}</p>
      )}
    </div>
  );
}

function Toolbar({ ready, onLevels, onAddUnit, onAddTitle }: { ready: boolean; onLevels: () => void; onAddUnit: () => void; onAddTitle: () => void }) {
  const { t } = useTranslation('org');
  return (
    <Can permission={CorePermission.OrgManage}>
      <Button variant="secondary" onClick={onLevels} disabled={!ready}>{t('actions.levels')}</Button>
      <Button onClick={onAddUnit} disabled={!ready}>{t('actions.addUnit')}</Button>
      <Button variant="secondary" onClick={onAddTitle} disabled={!ready}>{t('actions.addTitle')}</Button>
    </Can>
  );
}

/** Which company is shown, which unit is selected and which of the three forms is open. */
function useOrgPage() {
  const me = useMe().data;
  const companies = useCompanyOptions();
  const [chosen, setChosen] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const companyId = chosen || me?.placement.companyId || companies.data?.[0]?.id || '';
  const treeQuery = useOrgTree(companyId || undefined);
  return {
    companies: companies.data ?? [], companyId, treeQuery, selectedId, setSelectedId, form, setForm, parentId,
    chooseCompany: (id: string) => { setChosen(id); setSelectedId(null); },
    openNode: (parent: string | null) => { setParentId(parent); setForm('node'); },
  };
}

type Page = ReturnType<typeof useOrgPage>;

/** The tree (or its empty state) and whichever of the three forms is open. */
function OrgBody({ page, tree }: { page: Page; tree: OrgTreeDto }) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const close = (open: boolean) => !open && page.setForm(null);
  const empty = tree.nodes.length === 0;
  return (
    <>
      {empty ? (
        <>
          <EmptyState icon={Network} title={t('empty.title')} description={t('empty.description')} action={<Can permission={CorePermission.OrgManage}><Button onClick={() => page.openNode(null)}>{t('empty.action')}</Button></Can>} />
          <p className="mt-4 text-center text-sm text-muted">{t('empty.levels', { levels: tree.levels.map((l) => (ar ? l.nameAr : l.nameEn)).join(' › ') })}</p>
        </>
      ) : (
        <TreePanel tree={tree} selectedId={page.selectedId} onSelect={page.setSelectedId} onAddTitles={() => page.setForm('titles')} onAddChild={page.openNode} />
      )}
      {page.form === 'levels' && <LevelsForm companyId={page.companyId} levels={tree.levels} open onOpenChange={close} />}
      {page.form === 'node' && <NodeForm tree={tree} initialParentId={page.parentId} open onOpenChange={close} />}
      {page.form === 'titles' && <TitlesForm tree={tree} initialNodeId={page.selectedId} open onOpenChange={close} />}
    </>
  );
}

/** The structure of one company as a tree, with three forms to build it: levels, units, job titles. */
export function OrgPage() {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const page = useOrgPage();
  const tree = page.treeQuery.data;

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Toolbar ready={!!tree} onLevels={() => page.setForm('levels')} onAddUnit={() => page.openNode(null)} onAddTitle={() => page.setForm('titles')} />} />
      <div className="mb-5 max-w-sm">
        <Select aria-label={t('company')} value={page.companyId} onChange={(e) => page.chooseCompany(e.target.value)}>
          {page.companies.map((c) => <option key={c.id} value={c.id}>{ar ? c.nameAr : c.nameEn}</option>)}
        </Select>
      </div>
      {page.treeQuery.isError && <Alert>{errorMessage(tc, page.treeQuery.error)}</Alert>}
      {tree && <OrgBody page={page} tree={tree} />}
    </>
  );
}
