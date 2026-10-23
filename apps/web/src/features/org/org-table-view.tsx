import type { OrgNodeDto, OrgTreeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { cn } from '@/shared/lib/cn';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Badge, DataTable, ListToolbar, type FilterField } from '@/shared/ui';

/** How far a unit is indented by its depth (logical padding, so it follows the reading direction). */
const INDENT = ['', 'ps-4', 'ps-8', 'ps-12', 'ps-16', 'ps-20'];

interface Props {
  tree: OrgTreeDto;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Units in tree order (each parent before its children) with how deep they sit. */
function inTreeOrder(nodes: OrgNodeDto[]): { node: OrgNodeDto; depth: number }[] {
  const walk = (parentId: string | null, depth: number): { node: OrgNodeDto; depth: number }[] =>
    nodes.filter((n) => n.parentId === parentId).flatMap((node) => [{ node, depth }, ...walk(node.id, depth + 1)]);
  return walk(null, 0);
}

/** The structure as a table: the same units as the chart, with search, filters on every attribute and export. */
export function OrgTableView({ tree, selectedId, onSelect }: Props) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const list = useListPage('org-units');
  const levels = new Map(tree.levels.map((l) => [l.id, ar ? l.nameAr : l.nameEn]));
  const name = (n: OrgNodeDto) => (ar ? n.nameAr : n.nameEn);
  const yesNo = (withLabel: string, withoutLabel: string) => [{ value: 'with', label: withLabel }, { value: 'without', label: withoutLabel }];
  const fields: FilterField[] = [
    { id: 'level', label: t('details.level'), type: 'select', options: tree.levels.map((l) => ({ value: l.id, label: ar ? l.nameAr : l.nameEn })) },
    { id: 'status', label: t('details.status'), type: 'select', options: [{ value: 'active', label: tc('status.active') }, { value: 'inactive', label: tc('status.inactive') }] },
    { id: 'employees', label: t('details.employees'), type: 'select', options: yesNo(t('table.withEmployees'), t('table.withoutEmployees')) },
    { id: 'manager', label: t('details.manager'), type: 'select', options: yesNo(t('table.withManager'), t('table.withoutManager')) },
  ];
  const { values } = list.filters;
  const rows = inTreeOrder(tree.nodes).filter(
    ({ node: n }) =>
      matchesText([n.nameAr, n.nameEn, n.pathAr, n.pathEn, n.managerName], list.term) &&
      (!values.level || n.levelId === values.level) &&
      (!values.status || n.isActive === (values.status === 'active')) &&
      (!values.employees || n.employeesCount > 0 === (values.employees === 'with')) &&
      (!values.manager || !!n.managerName === (values.manager === 'with')),
  );
  const exportColumns: ExportColumn<{ node: OrgNodeDto }>[] = [
    { id: 'name', header: t('table.name'), value: ({ node }) => name(node) },
    { id: 'level', header: t('details.level'), value: ({ node }) => levels.get(node.levelId) },
    { id: 'path', header: t('table.path'), value: ({ node }) => (ar ? node.pathAr : node.pathEn) },
    { id: 'manager', header: t('details.manager'), value: ({ node }) => node.managerName },
    { id: 'employees', header: t('details.employees'), value: ({ node }) => node.employeesCount },
    { id: 'titles', header: t('details.titles'), value: ({ node }) => node.jobTitles.length },
    { id: 'status', header: t('details.status'), value: ({ node }) => tc(node.isActive ? 'status.active' : 'status.inactive') },
  ];

  return (
    <DataTable<{ node: OrgNodeDto; depth: number }>
      listKey="org"
      caption={t('title')}
      title={t('table.title', { count: rows.length })}
      toolbar={<ListToolbar listKey="org" {...list.toolbar({ label: t('table.searchLabel'), placeholder: t('table.searchPlaceholder') }, fields, false)} actions={<ExchangeButtons exporting={{ columns: exportColumns, filename: 'org-units', pageRows: rows, total: rows.length, loadAll: async () => rows }} />} />}
      rows={rows}
      rowKey={({ node }) => node.id}
      columns={[
        {
          id: 'name',
          header: t('table.name'),
          cell: ({ node, depth }) => (
            <button type="button" aria-pressed={node.id === selectedId} onClick={() => onSelect(node.id)} className="rounded-md px-1 text-start font-medium text-link underline-offset-4 hover:underline">
              <span className={cn('inline-block', INDENT[Math.min(depth, INDENT.length - 1)])} aria-hidden />{name(node)}
            </button>
          ),
        },
        { id: 'level', header: t('details.level'), cell: ({ node }) => levels.get(node.levelId) },
        { id: 'manager', header: t('details.manager'), cell: ({ node }) => node.managerName ?? <span className="text-muted">—</span> },
        { id: 'employees', header: t('details.employees'), cell: ({ node }) => <span dir="ltr">{node.employeesCount}</span> },
        { id: 'titles', header: t('details.titles'), cell: ({ node }) => <span dir="ltr">{node.jobTitles.length}</span> },
        { id: 'status', header: t('details.status'), cell: ({ node }) => <Badge tone={node.isActive ? 'success' : 'neutral'}>{tc(node.isActive ? 'status.active' : 'status.inactive')}</Badge> },
      ]}
    />
  );
}
