import { CorePermission, type TemplatesDto } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import { FileStack, FileUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can, usePermissions } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Alert, Badge, Button, ConfirmDialog, DataTable, EmptyState, ListToolbar, RowAction, type Column } from '@/shared/ui';
import type { FilterField } from '@/shared/ui/list-toolbar';
import { useRemoveStage } from './api';
import { FiscalEditorDialog } from './fiscal-editor-dialog';
import { ScaleEditorDialog } from './scale-editor-dialog';
import { StageEditorDialog } from './stage-editor-dialog';
import { templateRows, type TemplateRow } from './template-rows';

/** The name of a part: «المرحلة 1 التأسيس», «سلم الدرجات» or «بطاقة السنة المالية». */
const partName = (t: TFunction<'performance'>, r: TemplateRow): string => (r.kind === 'stage' ? t('templates.stage', { stage: r.stage, name: r.template?.name || t(`readiness.names.${r.stage}`) }) : t(`templates.kinds.${r.kind}`));

/** What a kept part holds, in a line: the weights, the criteria, the behaviours and the cap; the levels; the months and the notes. */
function partDetails(t: TFunction<'performance'>, r: TemplateRow, templates: TemplatesDto): string {
  if (!r.have) return '—';
  if (r.kind === 'scale') return t('templates.levels', { count: templates.scale?.length ?? 0 });
  if (r.kind === 'fiscal') return t('templates.months', { months: templates.fiscal?.months.length ?? 0, notes: templates.fiscal?.notes.length ?? 0 });
  const x = r.template!;
  return [`${x.resultsWeight}/${x.behaviourWeight}`, t('file.criteriaCount', { count: x.criteria.length }), t('file.behavioursCount', { count: x.behaviours.length }), `${x.cap}%`].join(' · ');
}

function templateColumns(t: TFunction<'performance'>, templates: TemplatesDto): Column<TemplateRow>[] {
  return [
    { id: 'part', header: t('templates.columns.part'), cell: (r) => <span className="font-medium">{partName(t, r)}</span> },
    { id: 'details', header: t('templates.columns.details'), cell: (r) => partDetails(t, r, templates) },
    { id: 'status', header: t('templates.columns.status'), cell: (r) => <Badge tone={r.have ? 'success' : 'warning'}>{t(r.have ? 'readiness.yes' : 'readiness.no')}</Badge> },
  ];
}

function templateExport(t: TFunction<'performance'>, templates: TemplatesDto): ExportColumn<TemplateRow>[] {
  return [
    { id: 'part', header: t('templates.columns.part'), value: (r) => partName(t, r) },
    { id: 'details', header: t('templates.columns.details'), value: (r) => partDetails(t, r, templates) },
    { id: 'status', header: t('templates.columns.status'), value: (r) => t(r.have ? 'readiness.yes' : 'readiness.no') },
  ];
}

const templateFilters = (t: TFunction<'performance'>): FilterField[] => [
  { id: 'kind', label: t('templates.columns.kind'), type: 'select', options: (['stage', 'scale', 'fiscal'] as const).map((k) => ({ value: k, label: t(`templates.filterKinds.${k}`) })) },
  { id: 'status', label: t('templates.columns.status'), type: 'select', options: [{ value: 'have', label: t('readiness.yes') }, { value: 'missing', label: t('readiness.no') }] },
];

/** The icons of a row: change a kept part, add one that is missing, and delete a kept stage. */
function TemplateActions({ row, name, onEdit, onRemove }: { row: TemplateRow; name: string; onEdit: () => void; onRemove: () => void }) {
  const { t } = useTranslation('performance');
  return (
    <Can permission={CorePermission.PerformanceTemplateEdit}>
      <RowAction label={`${t(row.have ? 'templates.edit' : 'templates.add')}: ${name}`} icon={row.have ? Pencil : Plus} onClick={onEdit} />
      {row.have && row.kind === 'stage' && <RowAction label={`${t('templates.remove')}: ${name}`} icon={Trash2} danger onClick={onRemove} />}
    </Can>
  );
}

/** The evaluation file as a list: the five stages, the grade scale and the fiscal card, each kept or not, with a way to add, change or delete (stages) and to upload the whole file. */
export function TemplatesList({ templates, onUpload }: { templates: TemplatesDto; onUpload: () => void }) {
  const { t } = useTranslation('performance');
  const list = useListPage('performance-templates');
  const canEdit = usePermissions().can(CorePermission.PerformanceTemplateEdit);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [removing, setRemoving] = useState<TemplateRow | null>(null);
  const remove = useRemoveStage();
  const { kind, status } = list.filters.values;
  const rows = templateRows(templates).filter((r) => matchesText([partName(t, r)], list.term) && (!kind || r.kind === kind) && (!status || (status === 'have') === r.have));
  const exporting = { columns: templateExport(t, templates), filename: 'performance-templates', pageRows: rows, total: rows.length, loadAll: async () => rows };
  const upload = <Can permission={CorePermission.PerformanceTemplateUpload}><Button variant="secondary" onClick={onUpload}><FileUp className="size-4" aria-hidden />{t('actions.file')}</Button></Can>;
  return (
    <>
      <DataTable<TemplateRow>
        listKey="performance-templates"
        caption={t('templates.title')}
        title={t('templates.title')}
        view={list.view}
        rows={rows}
        rowKey={(r) => r.id}
        columns={templateColumns(t, templates)}
        onRowClick={canEdit ? setEditing : undefined}
        toolbar={<ListToolbar listKey="performance-templates" {...list.toolbar({ label: t('templates.searchLabel'), placeholder: t('templates.searchPlaceholder') }, templateFilters(t))} actions={<><ExchangeButtons permissions={{ export: CorePermission.PerformanceTemplateExport }} exporting={exporting} />{upload}</>} />}
        actions={(r) => <TemplateActions row={r} name={partName(t, r)} onEdit={() => setEditing(r)} onRemove={() => setRemoving(r)} />}
        empty={<EmptyState icon={FileStack} title={t('templates.noMatches')} />}
      />
      <p className="px-2 text-sm text-muted">{t('templates.note')}</p>
      {editing?.kind === 'stage' && <StageEditorDialog stage={editing.stage!} template={editing.template} onClose={() => setEditing(null)} />}
      {editing?.kind === 'scale' && <ScaleEditorDialog bands={templates.scale} onClose={() => setEditing(null)} />}
      {editing?.kind === 'fiscal' && <FiscalEditorDialog card={templates.fiscal} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!removing} onOpenChange={(o) => { if (!o) { remove.reset(); setRemoving(null); } }} title={t('templates.removeTitle')} description={removing ? t('templates.removeDescription', { name: partName(t, removing) }) : undefined} tone="danger" confirmLabel={t('templates.remove')} busy={remove.isPending} onConfirm={() => { if (removing?.stage) remove.mutate(removing.stage, { onSuccess: () => { toast.success(t('templates.removed')); setRemoving(null); } }); }}>
        {remove.isError && <Alert tone="danger">{t('templates.removeFailed')}</Alert>}
      </ConfirmDialog>
    </>
  );
}
