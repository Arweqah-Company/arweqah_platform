import { CATALOG_KINDS, CATALOG_POINTS_MAX, CATALOG_TITLE_MIN, CorePermission, type CatalogItemDto, type CatalogKind } from '@arweqah-platform/shared';
import { ListPlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Alert, Badge, Button, ConfirmDialog, DataTable, Dialog, DialogFooter, EmptyState, FormField, Input, ListToolbar, RowAction, Select, type Column } from '@/shared/ui';
import { useAddItem, useRemoveItem } from './api';

function AddDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('performance');
  const add = useAddItem();
  const [form, setForm] = useState({ kind: 'init' as CatalogKind, title: '', points: '' });
  const titleOk = form.title.trim().length >= CATALOG_TITLE_MIN;
  const points = Number(form.points);
  const pointsOk = Number.isInteger(points) && points >= 1 && points <= CATALOG_POINTS_MAX;
  const [tried, setTried] = useState(false);
  const submit = () => {
    setTried(true);
    if (titleOk && pointsOk) add.mutate({ kind: form.kind, title: form.title.trim(), points }, { onSuccess: () => { toast.success(t('catalog.added')); onClose(); } });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('catalog.add')} description={t('catalog.addHint')}>
      <FormField label={t('catalog.columns.kind')}>{(p) => <Select {...p} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CatalogKind })}>{CATALOG_KINDS.map((k) => <option key={k} value={k}>{t(`catalog.kinds.${k}`)}</option>)}</Select>}</FormField>
      <FormField label={t('catalog.columns.title')} error={tried && !titleOk ? t('catalog.titleShort', { min: CATALOG_TITLE_MIN }) : undefined}>{(p) => <Input {...p} maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}</FormField>
      <FormField label={t('catalog.columns.points')} error={tried && !pointsOk ? t('catalog.pointsRange', { max: CATALOG_POINTS_MAX }) : undefined}>{(p) => <Input {...p} inputMode="numeric" dir="ltr" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value.trim() })} />}</FormField>
      {add.isError && <Alert tone="danger">{t('catalog.failed')}</Alert>}
      <DialogFooter><Button disabled={add.isPending} onClick={submit}>{t('catalog.add')}</Button><Button variant="secondary" onClick={onClose}>{t('close')}</Button></DialogFooter>
    </Dialog>
  );
}

/** The catalog of the extra component: the items employees may choose, with their points; search, a filter by kind, export, add and delete. */
export function CatalogTable({ items }: { items: CatalogItemDto[] }) {
  const { t } = useTranslation('performance');
  const list = useListPage('performance-catalog');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CatalogItemDto | null>(null);
  const remove = useRemoveItem();
  const rows = items.filter((i) => matchesText([i.title], list.term) && (!list.filters.values.kind || i.kind === list.filters.values.kind));
  const columns: Column<CatalogItemDto>[] = [
    { id: 'title', header: t('catalog.columns.title'), cell: (i) => <span className="font-medium">{i.title}</span> },
    { id: 'kind', header: t('catalog.columns.kind'), cell: (i) => <Badge tone={i.kind === 'init' ? 'info' : 'success'}>{t(`catalog.kinds.${i.kind}`)}</Badge> },
    { id: 'points', header: t('catalog.columns.points'), cell: (i) => <span dir="ltr">{i.points}</span> },
  ];
  const exportColumns: ExportColumn<CatalogItemDto>[] = [
    { id: 'title', header: t('catalog.columns.title'), value: (i) => i.title },
    { id: 'kind', header: t('catalog.columns.kind'), value: (i) => t(`catalog.kinds.${i.kind}`) },
    { id: 'points', header: t('catalog.columns.points'), value: (i) => i.points },
  ];
  const exporting = { columns: exportColumns, filename: 'performance-catalog', pageRows: rows, total: rows.length, loadAll: async () => rows };
  const fields = [{ id: 'kind', label: t('catalog.columns.kind'), type: 'select' as const, options: CATALOG_KINDS.map((k) => ({ value: k, label: t(`catalog.kinds.${k}`) })) }];
  return (
    <>
      <DataTable<CatalogItemDto>
        listKey="performance-catalog"
        caption={t('catalog.title')}
        title={t('catalog.title')}
        view={list.view}
        rows={rows}
        rowKey={(i) => i.id}
        toolbar={<ListToolbar listKey="performance-catalog" {...list.toolbar({ label: t('catalog.searchLabel'), placeholder: t('catalog.searchPlaceholder') }, fields)} actions={<><ExchangeButtons permissions={{ export: CorePermission.PerformanceCatalogExport }} exporting={exporting} /><Can permission={CorePermission.PerformanceCatalogManage}><Button variant="secondary" onClick={() => setAdding(true)}><ListPlus className="size-4" aria-hidden />{t('catalog.add')}</Button></Can></>} />}
        actions={(i) => <Can permission={CorePermission.PerformanceCatalogManage}><RowAction label={`${t('catalog.remove')}: ${i.title}`} icon={Trash2} danger onClick={() => setRemoving(i)} /></Can>}
        empty={<EmptyState icon={ListPlus} title={list.narrowed ? t('catalog.noMatches') : t('catalog.empty')} />}
        columns={columns}
      />
      {adding && <AddDialog onClose={() => setAdding(false)} />}
      <ConfirmDialog open={!!removing} onOpenChange={(o) => { if (!o) { remove.reset(); setRemoving(null); } }} title={t('catalog.removeTitle')} description={removing?.title} tone="danger" confirmLabel={t('catalog.remove')} busy={remove.isPending} onConfirm={() => { if (removing) remove.mutate(removing.id, { onSuccess: () => { toast.success(t('catalog.removed')); setRemoving(null); } }); }}>
        {remove.isError && <Alert tone="danger">{t('catalog.removeFailed')}</Alert>}
      </ConfirmDialog>
    </>
  );
}
