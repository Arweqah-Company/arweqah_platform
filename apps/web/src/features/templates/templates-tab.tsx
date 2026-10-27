import type { TemplateDto, TemplateKind } from '@arweqah-platform/shared';
import { FileText, Pencil, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, ConfirmDialog, DataTable, EmptyState, ListToolbar, RowAction } from '@/shared/ui';
import { useResetTemplate } from './api';
import { ApprovalSwitch } from './approval-switch';
import { KIND_KEYS } from './keys';
import { TemplateDialog } from './template-dialog';
import { useTemplateRows } from './use-template-rows';

const STATUS_TONE = { default: 'neutral', custom: 'info', pending: 'warning' } as const;

/** Asks before a message goes back to its default wording, then does it. */
function ResetConfirm({ kind, template, onClose }: { kind: TemplateKind; template: TemplateDto | null; onClose: () => void }) {
  const { t } = useTranslation('templates');
  const { t: tc } = useTranslation();
  const reset = useResetTemplate(kind);
  const confirm = async () => {
    try {
      await reset.mutateAsync(template!.key);
      toast.success(t('saved.reset'));
      onClose();
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return <ConfirmDialog open={!!template} onOpenChange={(next) => !next && onClose()} title={t('reset.title')} description={t('reset.description')} confirmLabel={t('actions.reset')} tone="danger" busy={reset.isPending} onConfirm={confirm} />;
}

/** The messages of one kind (e-mail or notification): one list, table or cards; open one to reword it. */
export function TemplatesTab({ kind }: { kind: TemplateKind }) {
  const { t, i18n } = useTranslation('templates');
  const { t: tc } = useTranslation();
  const keys = KIND_KEYS[kind];
  const { catalog, list, fields, rows, exportColumns, name } = useTemplateRows(kind);
  const [open, setOpen] = useState<string | null>(null);
  const [resetting, setResetting] = useState<TemplateDto | null>(null);
  const opened = catalog.data?.templates.find((x) => x.key === open);
  return (
    <>
      <p className="mb-4 max-w-[70ch] text-sm text-muted">{t(`description.${kind}`)}</p>
      <ApprovalSwitch kind={kind} requireApproval={catalog.data?.requireApproval ?? false} loading={!catalog.data} />
      <DataTable<TemplateDto>
        listKey={keys.listKey}
        caption={t(`title.${kind}`)}
        view={list.view}
        toolbar={<ListToolbar listKey={keys.listKey} {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: keys.exportKey }} exporting={{ columns: exportColumns, filename: `${kind}-templates`, pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} />} />}
        rows={rows}
        isLoading={catalog.isPending}
        error={catalog.error}
        rowKey={(x) => x.key}
        onRowClick={(x) => setOpen(x.key)}
        actions={(x) => (
          <>
            <RowAction label={tc('actions.edit')} icon={Pencil} onClick={() => setOpen(x.key)} />
            <Can permission={keys.reset}>{x.status !== 'default' && <RowAction label={t('actions.reset')} icon={Undo2} danger onClick={() => setResetting(x)} />}</Can>
          </>
        )}
        empty={<EmptyState icon={FileText} title={t('noMatches')} />}
        columns={[
          { id: 'template', header: t('columns.template'), cell: (x) => <div><p className="font-medium">{name(x)}</p><p className="text-sm text-muted">{i18n.language === 'ar' ? x.descriptionAr : x.descriptionEn}</p></div> },
          { id: 'area', header: t('columns.area'), cell: (x) => <Badge tone="neutral">{t(`areas.${x.area}`)}</Badge> },
          { id: 'status', header: t('columns.status'), cell: (x) => <Badge tone={STATUS_TONE[x.status]}>{t(`status.${x.status}`)}</Badge> },
          { id: 'updated', header: t('columns.updated'), cell: (x) => (x.updatedAt ? new Date(x.updatedAt).toLocaleString(i18n.language) : '—') },
        ]}
      />
      {opened && <TemplateDialog key={opened.key} kind={kind} template={opened} requireApproval={catalog.data?.requireApproval ?? false} onClose={() => setOpen(null)} />}
      <ResetConfirm kind={kind} template={resetting} onClose={() => setResetting(null)} />
    </>
  );
}
