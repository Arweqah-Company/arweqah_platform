import type { TourStepSettingDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Compass, Pencil, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, ConfirmDialog, DataTable, EmptyState, ListToolbar, RowAction } from '@/shared/ui';
import { TOUR_KEYS } from './keys';
import { useReorderSteps, useResetStep } from './settings.api';
import { StepDialog } from './step-dialog';
import { useStepRows } from './use-step-rows';

/** Moves a step one place up or down inside its own tour, whatever the filters show. */
function useMove(all: TourStepSettingDto[] | undefined) {
  const { t: tc } = useTranslation();
  const reorder = useReorderSteps();
  return async (step: TourStepSettingDto, by: -1 | 1) => {
    const keys = (all ?? []).filter((s) => s.tour === step.tour).map((s) => s.key);
    const from = keys.indexOf(step.key);
    const to = from + by;
    if (from < 0 || to < 0 || to >= keys.length) return;
    [keys[from], keys[to]] = [keys[to]!, keys[from]!];
    try {
      await reorder.mutateAsync({ tour: step.tour, keys });
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
}

function ResetConfirm({ step, onClose }: { step: TourStepSettingDto | null; onClose: () => void }) {
  const { t } = useTranslation('tour');
  const { t: tc } = useTranslation();
  const reset = useResetStep();
  const confirm = async () => {
    try {
      await reset.mutateAsync(step!.key);
      toast.success(t('settings.resetDone'));
      onClose();
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return <ConfirmDialog open={!!step} onOpenChange={(next) => !next && onClose()} title={t('settings.reset.title')} description={t('settings.reset.description')} confirmLabel={t('settings.reset.confirm')} tone="danger" busy={reset.isPending} onConfirm={() => void confirm()} />;
}

/** The welcome tour's steps of both tours: reword a step, switch it off, move it, or go back to the code's wording. */
export function TourStepsTab() {
  const { t, i18n } = useTranslation('tour');
  const { t: tc } = useTranslation();
  const { steps, list, fields, rows, exportColumns, title } = useStepRows();
  const move = useMove(steps.data?.steps);
  const [open, setOpen] = useState<string | null>(null);
  const [resetting, setResetting] = useState<TourStepSettingDto | null>(null);
  const opened = steps.data?.steps.find((x) => x.key === open);
  return (
    <>
      <p className="mb-4 max-w-[70ch] text-sm text-muted">{t('settings.description')}</p>
      <DataTable<TourStepSettingDto>
        listKey="tour-steps"
        caption={t('settings.title')}
        view={list.view}
        toolbar={<ListToolbar listKey="tour-steps" {...list.toolbar({ label: t('settings.searchLabel'), placeholder: t('settings.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: TOUR_KEYS.exportKey }} exporting={{ columns: exportColumns, filename: 'tour-steps', pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} />} />}
        rows={rows}
        isLoading={steps.isPending}
        error={steps.error}
        rowKey={(x) => x.key}
        onRowClick={(x) => setOpen(x.key)}
        actions={(x) => (
          <>
            <Can permission={TOUR_KEYS.reorder}>
              <RowAction label={t('settings.moveUp')} icon={ArrowUp} onClick={() => void move(x, -1)} />
              <RowAction label={t('settings.moveDown')} icon={ArrowDown} onClick={() => void move(x, 1)} />
            </Can>
            <RowAction label={tc('actions.edit')} icon={Pencil} onClick={() => setOpen(x.key)} />
            <Can permission={TOUR_KEYS.reset}>{x.customised && <RowAction label={t('settings.reset.confirm')} icon={Undo2} danger onClick={() => setResetting(x)} />}</Can>
          </>
        )}
        empty={<EmptyState icon={Compass} title={t('settings.noMatches')} />}
        columns={[
          { id: 'title', header: t('settings.columns.title'), cell: (x) => <p className="font-medium">{title(x)}</p> },
          { id: 'order', header: t('settings.columns.order'), cell: (x) => x.order },
          { id: 'tour', header: t('settings.columns.tour'), cell: (x) => <Badge tone="neutral">{t(`settings.tours.${x.tour}`)}</Badge> },
          { id: 'status', header: t('settings.columns.status'), cell: (x) => <Badge tone={x.enabled ? 'success' : 'neutral'}>{t(`settings.status.${x.enabled ? 'on' : 'off'}`)}</Badge> },
          { id: 'updated', header: t('settings.columns.updated'), cell: (x) => (x.updatedAt ? new Date(x.updatedAt).toLocaleString(i18n.language) : '—') },
        ]}
      />
      {opened && <StepDialog key={opened.key} step={opened} heading={title(opened)} onClose={() => setOpen(null)} />}
      <ResetConfirm step={resetting} onClose={() => setResetting(null)} />
    </>
  );
}
