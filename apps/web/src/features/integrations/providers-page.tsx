import { type IntegrationKind, type ProviderDto } from '@arweqah-platform/shared';
import { CircleHelp, FlaskConical, Pencil, Plug, Power, PowerOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { errorMessage } from '@/shared/lib/error-message';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Alert, Badge, DataTable, EmptyState, ListToolbar, RowAction, type FilterField } from '@/shared/ui';
import { useActivateProvider, useDeactivateProvider, useProviders } from './api';
import { KIND_SETTINGS } from './keys';
import { ProviderModals, type Modal } from './provider-modals';

const STATUS_TONE = { incomplete: 'warning', untested: 'info', tested: 'success' } as const;

/** The providers of one kind (translation or e-mail): one list, table or cards, with its own page title and permission keys. */
export function ProvidersPage({ kind }: { kind: IntegrationKind }) {
  const { t } = useTranslation('integrations');
  const { t: tc } = useTranslation();
  const keys = KIND_SETTINGS[kind];
  const catalog = useProviders(kind);
  const activate = useActivateProvider(kind);
  const deactivate = useDeactivateProvider(kind);
  const list = useListPage(keys.listKey);
  const [modal, setModal] = useState<Modal | null>(null);
  const name = (p: ProviderDto) => t(`providers.${p.providerKey}`);
  const status = (p: ProviderDto) => t(`status.${p.status}`);
  const fields: FilterField[] = [
    { id: 'status', label: t('columns.status'), type: 'select', options: (['incomplete', 'untested', 'tested'] as const).map((value) => ({ value, label: t(`status.${value}`) })) },
    { id: 'active', label: t('columns.active'), type: 'select', options: [{ value: 'yes', label: t('yes') }, { value: 'no', label: t('no') }] },
  ];
  const rows = catalog.data?.providers.filter(
    (p) => matchesText([name(p), p.providerKey], list.term) && (!list.filters.values.status || p.status === list.filters.values.status) && (!list.filters.values.active || p.isActive === (list.filters.values.active === 'yes')),
  );
  const exportColumns: ExportColumn<ProviderDto>[] = [
    { id: 'provider', header: t('columns.provider'), value: name },
    { id: 'status', header: t('columns.status'), value: status },
    { id: 'tested', header: t('columns.tested'), value: (p) => p.testedAt ?? '' },
    { id: 'active', header: t('columns.active'), value: (p) => (p.isActive ? t('yes') : t('no')) },
  ];
  const switchTo = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <>
      <p className="mb-4 max-w-[70ch] text-sm text-muted">{t(`description.${kind}`)}</p>
      {catalog.data?.usingServerSettings && <div className="mb-4"><Alert tone="info">{t(`serverSettings.${kind}`)}</Alert></div>}
      <DataTable<ProviderDto>
        listKey={keys.listKey}
        caption={t(`title.${kind}`)}
        view={list.view}
        toolbar={<ListToolbar listKey={keys.listKey} {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: keys.exportKey }} exporting={{ columns: exportColumns, filename: `${kind}-providers`, pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} />} />}
        rows={rows}
        isLoading={catalog.isPending}
        error={catalog.error}
        rowKey={(p) => p.providerKey}
        onRowClick={(p) => setModal({ type: 'edit', providerKey: p.providerKey })}
        actions={(p) => (
          <>
            <RowAction label={t('help.open')} icon={CircleHelp} onClick={() => setModal({ type: 'help', providerKey: p.providerKey })} />
            <RowAction label={tc('actions.edit')} icon={Pencil} onClick={() => setModal({ type: 'edit', providerKey: p.providerKey })} />
            <Can permission={keys.test}>{p.status !== 'incomplete' && <RowAction label={t('test.open')} icon={FlaskConical} onClick={() => setModal({ type: 'test', providerKey: p.providerKey })} />}</Can>
            <Can permission={keys.activate}>
              {p.isActive ? (
                <RowAction label={t('deactivate')} icon={PowerOff} danger onClick={() => void switchTo(() => deactivate.mutateAsync(undefined), t('deactivated', { name: name(p) }))} />
              ) : (
                p.status === 'tested' && <RowAction label={t('activate')} icon={Power} onClick={() => void switchTo(() => activate.mutateAsync(p.providerKey), t('activated', { name: name(p) }))} />
              )}
            </Can>
          </>
        )}
        empty={<EmptyState icon={Plug} title={t('noMatches')} />}
        columns={[
          { id: 'provider', header: t('columns.provider'), cell: (p) => <div><p className="font-medium">{name(p)}</p><p className="text-sm text-muted">{t(`help.providers.${p.providerKey}.summary`)}</p></div> },
          { id: 'status', header: t('columns.status'), cell: (p) => <Badge tone={STATUS_TONE[p.status]}>{status(p)}</Badge> },
          { id: 'tested', header: t('columns.tested'), cell: (p) => (p.testedAt ? new Date(p.testedAt).toLocaleString() : '—') },
          { id: 'active', header: t('columns.active'), cell: (p) => <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? t('active') : t('inactive')}</Badge> },
        ]}
      />
      <ProviderModals kind={kind} providers={catalog.data?.providers ?? []} modal={modal} onClose={() => setModal(null)} />
    </>
  );
}
