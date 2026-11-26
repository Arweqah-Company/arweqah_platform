import { CorePermission, type TicketListItemDto } from '@arweqah-platform/shared';
import { usePermissions } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { useTicketExportColumns } from './tickets-columns';

type Params = Record<string, string | number | boolean | undefined>;

/**
 * The tickets of the page's search and filters, and the export buttons that go with them. Whoever may export gets each ticket's text
 * with the rows, so the file of this page and the file of all the results both hold it; the others are not sent it.
 */
export function useTicketsList(list: ListPage, params: Params) {
  const columns = useTicketExportColumns();
  const canExport = usePermissions().can(CorePermission.TicketsExport);
  const { table, loadAll } = useServerList<TicketListItemDto>('tickets', '/tickets', list, canExport ? { ...params, withDetails: true } : params);
  const exchange = <ExchangeButtons permissions={{ export: CorePermission.TicketsExport }} exporting={{ columns, filename: 'tickets', pageRows: table.rows ?? [], total: table.page?.total ?? 0, loadAll }} />;
  return { table, exchange };
}
