import { CorePermission } from '@arweqah-platform/shared';
import { Hash, Link2, Pencil, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { Alert, Badge, Button, ProgressSplit, type SplitPart } from '@/shared/ui';
import { useCompanyOptions } from './api';
import type { DetailsContext } from './details-tabs';
import { canHaveChildren, distribution, nodeName, type OrgNode } from './org-model';
import { UnitCode } from './unit-badges';

const FILLS: SplitPart['fill'][] = ['fill-petrol-800', 'fill-green-400', 'fill-orange-500', 'fill-neutral-500'];

/** Employees of the unit and everything under it per company: a bar with the numbers and the names beside it. */
function EmployeesByCompany({ node, ctx }: { node: OrgNode; ctx: DetailsContext }) {
  const { t, i18n } = useTranslation('org');
  const companies = useCompanyOptions().data ?? [];
  const total = ctx.model.counts.get(node.id) ?? 0;
  const byCompany = distribution(ctx.model.nodes, node.id);
  if (total === 0) return <p className="text-sm text-muted">{t('overview.noEmployees')}</p>;
  if (!byCompany) return <p className="text-sm">{t('overview.ownCompanyOnly', { count: total })}</p>;
  const parts = Object.entries(byCompany).filter(([, value]) => value > 0).map(([id, value], index) => {
    const company = companies.find((c) => c.id === id);
    return { key: id, label: company ? (i18n.language === 'ar' ? company.nameAr : company.nameEn) : id, value, fill: FILLS[index % FILLS.length] as SplitPart['fill'] };
  });
  return <ProgressSplit parts={parts} label={t('overview.distributionLabel')} />;
}

/** The code of the unit, or a chip saying there is none with a button to set it. */
function CodeCell({ node, onSet }: { node: OrgNode; onSet: () => void }) {
  const { t } = useTranslation('org');
  if (node.code) return <UnitCode code={node.code} />;
  return (
    <>
      <Badge tone="warning">{t('table.noCode')}</Badge>
      <Can adminMode permission={CorePermission.OrgUnitUpdate}><Button size="sm" variant="secondary" onClick={onSet}><Hash className="size-4" aria-hidden />{t('actions.setCode')}</Button></Can>
    </>
  );
}

/** Edit, add a unit under it, change its management type: each with its key. */
function Actions({ node, tree, page }: DetailsContext) {
  const { t } = useTranslation('org');
  const open = (action: 'edit' | 'mode') => () => page.setDialog({ kind: 'unit', action, nodeId: node.id });
  return (
    <div className="flex flex-wrap gap-2">
      <Can adminMode permission={CorePermission.OrgUnitUpdate}><Button size="sm" variant="secondary" onClick={open('edit')}><Pencil className="size-4" aria-hidden />{t('actions.edit')}</Button></Can>
      {canHaveChildren(tree, node.levelKey) && <Can adminMode permission={CorePermission.OrgUnitCreate}><Button size="sm" variant="secondary" onClick={() => page.setDialog({ kind: 'add', parentId: node.id })}><Plus className="size-4" aria-hidden />{t('actions.addUnder')}</Button></Can>}
      <Can adminMode permission={CorePermission.OrgUnitShare}><Button size="sm" variant="secondary" onClick={open('mode')}><Link2 className="size-4" aria-hidden />{t('actions.changeMode')}</Button></Can>
    </div>
  );
}

/** The facts of a unit: type, code, parent, how it is managed, how many employees and where they come from, and what the person may do. */
export function OverviewTab(ctx: DetailsContext) {
  const { t, i18n } = useTranslation('org');
  const { node, model, page } = ctx;
  const ar = i18n.language === 'ar';
  const level = model.levelById.get(node.levelId);
  const parent = node.parentId ? model.byId.get(node.parentId) : undefined;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">{t('table.type')}</dt><dd>{ar ? level?.nameAr : level?.nameEn}</dd>
        <dt className="text-muted">{t('table.code')}</dt><dd className="flex flex-wrap items-center gap-2"><CodeCell node={node} onSet={() => page.setDialog({ kind: 'unit', action: 'code', nodeId: node.id })} /></dd>
        <dt className="text-muted">{t('overview.parent')}</dt><dd>{parent ? nodeName(parent, ar) : t('chart.groupFull')}</dd>
        <dt className="text-muted">{t('table.mode')}</dt>
        <dd>{t(node.effectiveMode === 'shared' ? 'overview.sharedText' : 'overview.perCompanyText')}{node.managementMode === null && <span className="text-muted"> ({t('mode.inheritedFromParent')})</span>}</dd>
        <dt className="text-muted">{t('table.employees')}</dt><dd><b dir="ltr">{model.counts.get(node.id) ?? 0}</b> {t('overview.employeesIn', { units: model.nodes.filter((n) => n.parentId === node.id).length, titles: node.titles.length })}</dd>
      </dl>
      <h3 className="font-bold">{t('overview.byCompany')}</h3>
      <EmployeesByCompany node={node} ctx={ctx} />
      {node.effectiveMode === 'shared' && <Alert tone="info">{t('overview.sharedNote')}</Alert>}
      <Actions {...ctx} />
    </div>
  );
}
