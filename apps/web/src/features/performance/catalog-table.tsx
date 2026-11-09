import { CATALOG_KINDS, CATALOG_POINTS_MAX, CATALOG_TITLE_MIN, CorePermission, type CatalogItemDto, type CatalogKind } from '@arweqah-platform/shared';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
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

/** The new item: its name (three characters or more), its kind and its points (1 to 10, two to start with); a refused value is said in one sentence as it is typed. */
function AddDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('performance');
  const add = useAddItem();
  const initial = { kind: 'init' as CatalogKind, title: '', points: '2' };
  const [form, setForm] = useState(initial);
  const points = Number(form.points);
  const valid = form.title.trim().length >= CATALOG_TITLE_MIN && Number.isInteger(points) && points >= 1 && points <= CATALOG_POINTS_MAX;
  const [tried, setTried] = useState(false);
  const submit = () => {
    setTried(true);
    if (valid) add.mutate({ kind: form.kind, title: form.title.trim(), points }, { onSuccess: () => { toast.success(t('catalog.added')); onClose(); } });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('catalog.addTitle')}>
      <div className="flex flex-col gap-4">
        <FormField label={t('catalog.form.title')}>{(p) => <Input {...p} aria-required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}</FormField>
        <FormField label={t('catalog.form.kind')}>{(p) => <Select {...p} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CatalogKind })}>{CATALOG_KINDS.map((k) => <option key={k} value={k}>{t(`catalog.kinds.${k}`)}</option>)}</Select>}</FormField>
        <FormField label={t('catalog.form.points')}>{(p) => <Input {...p} aria-required type="number" min={1} max={CATALOG_POINTS_MAX} dir="ltr" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value.trim() })} />}</FormField>
        <p role="alert" className="text-sm text-danger-text empty:hidden">{(tried || JSON.stringify(form) !== JSON.stringify(initial)) && !valid ? t('catalog.invalid') : undefined}</p>
        {add.isError && <Alert tone="danger">{t('catalog.failed')}</Alert>}
      </div>
      <DialogFooter><Button disabled={add.isPending} onClick={submit}>{t('catalog.addConfirm')}</Button><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button></DialogFooter>
    </Dialog>
  );
}

/** The catalog of the extra component: the items employees may choose, with their points; search, a filter by kind, export, add and delete. */
export function CatalogTable({ items, caps }: { items: CatalogItemDto[]; caps: { init: number; growth: number } }) {
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
        toolbar={<ListToolbar listKey="performance-catalog" {...list.toolbar({ label: t('catalog.searchLabel'), placeholder: t('catalog.searchPlaceholder') }, fields)} actions={<><ExchangeButtons permissions={{ export: CorePermission.PerformanceCatalogExport }} exporting={exporting} /><Can permission={CorePermission.PerformanceCatalogManage}><Button variant="secondary" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden />{t('catalog.add')}</Button></Can></>} />}
        actions={(i) => <Can permission={CorePermission.PerformanceCatalogManage}><RowAction label={`${t('catalog.remove')}: ${i.title}`} icon={Trash2} danger onClick={() => setRemoving(i)} /></Can>}
        empty={<EmptyState icon={ListPlus} title={list.narrowed ? t('catalog.noMatches') : t('catalog.empty')} />}
        columns={columns}
      />
      <p className="px-2 text-sm text-muted">{t('catalog.caps', caps)}</p>
      {adding && <AddDialog onClose={() => setAdding(false)} />}
      <ConfirmDialog open={!!removing} onOpenChange={(o) => { if (!o) { remove.reset(); setRemoving(null); } }} title={t('catalog.removeTitle')} description={removing?.title} tone="danger" confirmLabel={t('catalog.remove')} busy={remove.isPending} onConfirm={() => { if (removing) remove.mutate(removing.id, { onSuccess: () => { toast.success(t('catalog.removed')); setRemoving(null); } }); }}>
        {remove.isError && <Alert tone="danger">{t('catalog.removeFailed')}</Alert>}
      </ConfirmDialog>
    </>
  );
}
