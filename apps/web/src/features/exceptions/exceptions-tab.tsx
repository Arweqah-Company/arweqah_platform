import { CorePermission, type AccessExceptionDto } from '@arweqah-platform/shared';
import { CalendarClock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { errorMessage } from '@/shared/lib/error-message';
import { useListPage } from '@/shared/lib/use-list-page';
import { useScopeLabel } from '@/shared/lib/use-scope-label';
import { Badge, ConfirmDialog, DataTable, ListToolbar, RowAction } from '@/shared/ui';
import { useExceptions, useRevokeException } from './api';
import { ExpiryDialog } from './expiry-dialog';
import { daysLeft, exceptionExportColumns, exceptionFilterFields, keyOf, matchesExceptionFilters, refOf, targetName } from './exceptions-list';

type Action = { kind: 'expiry' | 'revoke'; item: AccessExceptionDto };

/** The «Exceptions» tab of the roles page: what was given to a person outside what their job title brings, with its last day: change the day, or take it back. */
export function ExceptionsTab() {
  const { t, i18n } = useTranslation('exceptions');
  const { t: tc } = useTranslation();
  const scopeLabel = useScopeLabel();
  const exceptions = useExceptions();
  const revoke = useRevokeException();
  const list = useListPage('exceptions');
  const [action, setAction] = useState<Action | null>(null);
  const rows = exceptions.data?.filter((x) => matchesExceptionFilters(x, { term: list.term, filters: list.filters.values, language: i18n.language }));
  const name = (x: AccessExceptionDto) => targetName(x, i18n.language);
  const left = (x: AccessExceptionDto) => daysLeft(x.expiresAt);

  const confirmRevoke = async (item: AccessExceptionDto) => {
    try {
      await revoke.mutateAsync(refOf(item));
      toast.success(t('revoked'));
      setAction(null);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };

  return (
    <>
      <p className="mb-4 max-w-[70ch] text-sm text-muted">{t('description')}</p>
      <DataTable<AccessExceptionDto>
        listKey="exceptions"
        caption={t('title')}
        view={list.view}
        toolbar={<ListToolbar listKey="exceptions" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, exceptionFilterFields(t, exceptions.data ?? []))} actions={<ExchangeButtons permissions={{ export: CorePermission.ExceptionsExport }} exporting={{ columns: exceptionExportColumns(t, i18n.language), filename: 'exceptions', pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} />} />}
        rows={rows}
        isLoading={exceptions.isPending}
        error={exceptions.error}
        rowKey={keyOf}
        actions={(x) => (
          <>
            <Can permission={CorePermission.ExceptionsUpdate}><RowAction label={t('changeEnd')} icon={CalendarClock} onClick={() => setAction({ kind: 'expiry', item: x })} /></Can>
            <Can permission={CorePermission.ExceptionsRevoke}><RowAction label={t('revoke')} icon={Trash2} danger onClick={() => setAction({ kind: 'revoke', item: x })} /></Can>
          </>
        )}
        columns={[
          { id: 'person', header: t('person'), cell: (x) => <span className="font-medium">{x.userName}</span> },
          { id: 'kind', header: t('kind.label'), cell: (x) => <Badge tone="neutral">{t(`kind.${x.kind}`)}</Badge> },
          { id: 'target', header: t('target'), cell: name },
          { id: 'scope', header: t('scope'), cell: (x) => (x.scope ? scopeLabel(x.scope) : '—') },
          { id: 'grantedBy', header: t('grantedBy'), cell: (x) => x.grantedByName ?? '—' },
          { id: 'grantedAt', header: t('grantedAt'), className: 'whitespace-nowrap text-muted', cell: (x) => new Date(x.grantedAt).toLocaleDateString(i18n.language) },
          { id: 'expires', header: t('expires'), className: 'whitespace-nowrap', cell: (x) => (x.expiresAt ? <Badge tone={(left(x) ?? 99) <= 7 ? 'warning' : 'info'}>{t('endsOn', { date: x.expiresAt, days: left(x) })}</Badge> : <span className="text-muted">{t('noEnd')}</span>) },
        ]}
      />
      {action?.kind === 'expiry' && <ExpiryDialog item={action.item} targetName={name(action.item)} onClose={() => setAction(null)} />}
      {action?.kind === 'revoke' && (
        <ConfirmDialog open onOpenChange={(open) => !open && setAction(null)} title={t('revoke')} description={t('confirmRevoke', { person: action.item.userName, target: name(action.item) })} confirmLabel={t('revoke')} tone="danger" busy={revoke.isPending} onConfirm={() => confirmRevoke(action.item)} />
      )}
    </>
  );
}
