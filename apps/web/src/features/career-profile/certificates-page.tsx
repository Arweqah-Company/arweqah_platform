import { CorePermission, PROOF_KINDS, RECORD_STATUSES, type CertificateReviewItemDto } from '@arweqah-platform/shared';
import { Award, Check, Eye, Forward, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Alert, Badge, DataTable, EmptyState, ListToolbar, PageHeader, RowAction, type Column, type FilterField } from '@/shared/ui';
import { CertificateDialogs, type CertificateDialogState } from './certificate-dialogs';
import { STATE_TONE } from './proof-status';

/** The columns of the list and of its export. */
function useCertificateColumns(): { columns: Column<CertificateReviewItemDto>[]; exportColumns: ExportColumn<CertificateReviewItemDto>[] } {
  const { t, i18n } = useTranslation('career-profile');
  const unit = (x: CertificateReviewItemDto) => (i18n.language === 'ar' ? x.unitNameAr : x.unitNameEn) || x.unitNameAr || '';
  const date = (iso: string) => new Date(iso).toLocaleDateString();
  const columns: Column<CertificateReviewItemDto>[] = [
    { id: 'employee', header: t('certs.columns.employee'), cell: (x) => <span className="font-medium">{x.employeeName}</span> },
    { id: 'unit', header: t('certs.columns.unit'), cell: unit },
    { id: 'proof', header: t('certs.columns.proof'), cell: (x) => <span>{x.unitTitle}<span className="ms-2"><Badge tone="info">{t(`proof.kinds.${x.kind}.title`)}</Badge></span></span> },
    { id: 'minutes', header: t('certs.columns.minutes'), cell: (x) => <span dir="ltr">{x.minutes / 60}</span> },
    { id: 'submitted', header: t('certs.columns.submitted'), cell: (x) => date(x.submittedAt) },
    { id: 'status', header: t('certs.columns.status'), cell: (x) => <Badge tone={STATE_TONE[x.status]}>{t(`proof.state.${x.status}`)}</Badge> },
  ];
  const exportColumns: ExportColumn<CertificateReviewItemDto>[] = [
    { id: 'employee', header: t('certs.columns.employee'), value: (x) => x.employeeName }, { id: 'unit', header: t('certs.columns.unit'), value: unit },
    { id: 'proof', header: t('certs.columns.proof'), value: (x) => x.unitTitle }, { id: 'kind', header: t('proof.kind'), value: (x) => t(`proof.kinds.${x.kind}.title`) },
    { id: 'minutes', header: t('certs.columns.minutes'), value: (x) => x.minutes / 60 }, { id: 'submitted', header: t('certs.columns.submitted'), value: (x) => date(x.submittedAt) },
    { id: 'status', header: t('certs.columns.status'), value: (x) => t(`proof.state.${x.status}`) },
  ];
  return { columns, exportColumns };
}

function useCertificateFilters(): FilterField[] {
  const { t } = useTranslation('career-profile');
  return [
    { id: 'kind', label: t('certs.filters.kind'), type: 'select', options: PROOF_KINDS.map((k) => ({ value: k, label: t(`proof.kinds.${k}.title`) })) },
    { id: 'status', label: t('certs.filters.status'), type: 'select', options: RECORD_STATUSES.map((s) => ({ value: s, label: t(`proof.state.${s}`) })) },
  ];
}

/** The decisions on a proof that waits, as icons on its row, each with its own key (the reason of a rejection is asked in a window). */
function CertificateActions({ item, onOpen }: { item: CertificateReviewItemDto; onOpen: (state: CertificateDialogState) => void }) {
  const { t } = useTranslation('career-profile');
  const label = (key: string) => `${t(key)}: ${item.employeeName}`;
  const waiting = item.status === 'wait' || item.status === 'referred';
  return (
    <>
      <RowAction label={label('certs.open')} icon={Eye} onClick={() => onOpen({ kind: 'review', item })} />
      {waiting && <Can permission={CorePermission.CareerCertificatesApprove}><RowAction label={label('certs.approve')} icon={Check} onClick={() => onOpen({ kind: 'review', item })} /></Can>}
      {waiting && <Can permission={CorePermission.CareerCertificatesReject}><RowAction label={label('certs.reject.action')} icon={X} danger onClick={() => onOpen({ kind: 'reject', item })} /></Can>}
      {item.status === 'wait' && <Can permission={CorePermission.CareerCertificatesRefer}><RowAction label={label('certs.refer')} icon={Forward} onClick={() => onOpen({ kind: 'review', item })} /></Can>}
    </>
  );
}

/** «Certificate review»: the proofs employees sent for learning units, waiting ones first; a click on a row opens the review window. */
export function CertificatesPage() {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-certificates');
  const fields = useCertificateFilters();
  const { columns, exportColumns } = useCertificateColumns();
  const [open, setOpen] = useState<CertificateDialogState>(null);
  const { query, loadAll, table } = useServerList<CertificateReviewItemDto>('career-certificates', '/career/certificates', list, { search: list.term || undefined, kind: list.filters.values.kind || undefined, status: list.filters.values.status || undefined });
  const exporting = { columns: exportColumns, filename: 'career-certificates', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll };
  return (
    <>
      <PageHeader title={t('certs.title')} description={t('certs.description')} />
      <Alert tone="info">{t('certs.scope')}</Alert>
      <DataTable<CertificateReviewItemDto>
        listKey="career-certificates"
        {...table}
        caption={t('certs.title')}
        toolbar={<ListToolbar listKey="career-certificates" {...list.toolbar({ label: t('certs.searchLabel'), placeholder: t('certs.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.CareerCertificatesExport }} exporting={exporting} />} />}
        rowKey={(x) => x.id}
        onRowClick={(x) => setOpen({ kind: 'review', item: x })}
        actions={(x) => <CertificateActions item={x} onOpen={setOpen} />}
        empty={<EmptyState icon={Award} title={list.narrowed ? t('certs.noMatches') : t('certs.empty')} />}
        columns={columns}
      />
      <CertificateDialogs state={open} onChange={setOpen} />
    </>
  );
}
