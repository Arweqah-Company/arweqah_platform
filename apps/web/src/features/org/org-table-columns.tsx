import type { ExportColumn } from '@/shared/data-exchange/types';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Badge, ToneBadge, type Column } from '@/shared/ui';
import { nodeName, toneOfLevel, type OrgModel, type UnitRowData } from './org-model';
import { ModeBadge, StatusBadges, UnitCode } from './unit-badges';

/** How far a unit is indented by its depth (logical padding, so it follows the reading direction). */
const INDENT = ['', 'ps-4', 'ps-8', 'ps-12', 'ps-16', 'ps-20', 'ps-24'];

interface ColumnOptions {
  model: OrgModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** The names the table, the cards and the export write for a unit's type and its leader. */
function useUnitTexts(model: OrgModel) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const levelName = (row: UnitRowData) => {
    const level = model.levelById.get(row.node.levelId);
    return (ar ? level?.nameAr : level?.nameEn) ?? '';
  };
  return { t, ar, levelName };
}

/** Columns of the structure table and its cards (ids as in the list catalog, so an administrator can hide them). */
export function useOrgColumns({ model, selectedId, onSelect }: ColumnOptions): Column<UnitRowData>[] {
  const { t, ar, levelName } = useUnitTexts(model);
  return [
    {
      id: 'name',
      header: t('table.name'),
      cell: (row) => (
        <button type="button" aria-pressed={row.node.id === selectedId} onClick={() => onSelect(row.node.id)} className="rounded-md px-1 text-start font-medium text-link underline-offset-4 hover:underline">
          <span className={cn('inline-block', INDENT[Math.min(row.depth, INDENT.length - 1)])} aria-hidden />{nodeName(row.node, ar)}
        </button>
      ),
    },
    { id: 'code', header: t('table.code'), cell: ({ node }) => (node.code ? <UnitCode code={node.code} /> : <Badge tone="warning">{t('table.noCode')}</Badge>) },
    { id: 'level', header: t('table.type'), cell: (row) => <ToneBadge tone={toneOfLevel(model.levelById.get(row.node.levelId))}>{levelName(row)}</ToneBadge> },
    { id: 'mode', header: t('table.mode'), cell: ({ node }) => <ModeBadge node={node} /> },
    { id: 'leader', header: t('table.leader'), cell: ({ node }) => node.managerName ?? (node.hasNoLeader ? <Badge tone="danger">{t('status.noLeader')}</Badge> : <span className="text-muted">—</span>) },
    { id: 'employees', header: t('table.employees'), cell: ({ node }) => <span dir="ltr">{model.counts.get(node.id) ?? 0}</span> },
    { id: 'titles', header: t('table.titles'), cell: ({ node }) => <span dir="ltr">{node.titles.length}</span> },
    { id: 'status', header: t('table.status'), cell: ({ node }) => <StatusBadges node={node} /> },
  ];
}

/** What the export writes for each unit. */
export function useOrgExportColumns(model: OrgModel): ExportColumn<UnitRowData>[] {
  const { t, ar, levelName } = useUnitTexts(model);
  return [
    { id: 'name', header: t('table.name'), value: ({ node }) => nodeName(node, ar) },
    { id: 'code', header: t('table.code'), value: ({ node }) => node.code },
    { id: 'level', header: t('table.type'), value: levelName },
    { id: 'mode', header: t('table.mode'), value: ({ node }) => t(node.effectiveMode === 'shared' ? 'mode.shared' : 'mode.perCompany') },
    { id: 'leader', header: t('table.leader'), value: ({ node }) => node.managerName },
    { id: 'employees', header: t('table.employees'), value: ({ node }) => model.counts.get(node.id) ?? 0 },
    { id: 'titles', header: t('table.titles'), value: ({ node }) => node.titles.length },
    { id: 'status', header: t('table.status'), value: ({ node }) => (node.isActive ? t('status.inForce') : t('status.inactive')) },
  ];
}
