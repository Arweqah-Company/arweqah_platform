import { CorePermission, type OrgTreeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { Button, DataTable } from '@/shared/ui';
import type { OrgModel, UnitRowData } from './org-model';
import { useOrgColumns, useOrgExportColumns } from './org-table-columns';
import { UnitRowActions } from './unit-row-actions';
import type { OrgPageState } from './use-org-page';

interface Props {
  page: OrgPageState;
  tree: OrgTreeDto;
  model: OrgModel;
  cards: boolean;
}

/** Export of the units the table lists (the rows on screen are all of them: the structure is read in one request). */
export function OrgExport({ model }: { model: OrgModel }) {
  const columns = useOrgExportColumns(model);
  return <ExchangeButtons permissions={{ export: CorePermission.OrgExport }} exporting={{ columns, filename: 'org-units', pageRows: model.rows, total: model.rows.length, loadAll: async () => model.rows }} />;
}

/** The structure as a table or as cards: the same units, indented by depth, with every action on the row as an icon; a click on a row selects the unit. */
export function OrgTableView({ page, tree, model, cards }: Props) {
  const { t } = useTranslation('org');
  const columns = useOrgColumns({ model, selectedId: page.selectedId, onSelect: page.setSelectedId });
  const rowClass = ({ node }: UnitRowData) => (node.id === page.selectedId ? 'bg-petrol-50' : model.matching.has(node.id) ? undefined : 'bg-neutral-50');
  return (
    <DataTable<UnitRowData>
      listKey="org"
      caption={t('title')}
      title={t('table.title', { count: model.rows.length })}
      view={cards ? 'cards' : 'table'}
      rows={model.rows}
      rowKey={({ node }) => node.id}
      rowClassName={rowClass}
      onRowClick={({ node }) => page.setSelectedId(node.id)}
      actions={({ node }) => <UnitRowActions tree={tree} node={node} onSelect={page.setSelectedId} onDialog={page.setDialog} />}
      columns={columns}
      empty={<NoMatch onClear={page.list.clearAll} />}
    />
  );
}

function NoMatch({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation('org');
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-medium text-fg">{t('empty.noMatch')}</p>
      <Button variant="secondary" size="sm" onClick={onClear}>{t('empty.clear')}</Button>
    </div>
  );
}
