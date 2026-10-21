import type { EmployeesDecision, OrgImpactDto, OrgLevelDto, OrgLevelInput } from '@arweqah-platform/shared';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, Input } from '@/shared/ui';
import { usePreviewLevels, useSaveLevels } from './api';
import { ImpactDialog } from './impact-dialog';

interface Props {
  companyId: string;
  levels: OrgLevelDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fromDto = (l: OrgLevelDto): OrgLevelInput => ({ id: l.id, nameAr: l.nameAr, nameEn: l.nameEn, isAssignable: l.isAssignable });
const BLANK: OrgLevelInput = { nameAr: '', nameEn: '', isAssignable: false };
const isValid = (rows: OrgLevelInput[]) => rows.length > 0 && rows.every((r) => r.nameAr.trim().length >= 2 && r.nameEn.trim().length >= 2) && rows.at(-1)?.isAssignable === true;

interface RowProps {
  row: OrgLevelInput;
  index: number;
  count: number;
  onPatch: (change: Partial<OrgLevelInput>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}

function LevelRow({ row, index, count, onPatch, onMove, onRemove }: RowProps) {
  const { t } = useTranslation('org');
  return (
    <li className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
      <span className="pb-2 text-sm text-muted" dir="ltr">{index + 1}</span>
      <label className="text-xs">{t('levels.nameAr')}<Input value={row.nameAr} onChange={(e) => onPatch({ nameAr: e.target.value })} /></label>
      <label className="text-xs">{t('levels.nameEn')}<Input dir="ltr" value={row.nameEn} onChange={(e) => onPatch({ nameEn: e.target.value })} /></label>
      <span className="flex items-center gap-1 pb-1">
        <Button size="icon" variant="ghost" aria-label={t('levels.up')} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label={t('levels.down')} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label={t('levels.remove')} onClick={onRemove}><X className="size-4" /></Button>
      </span>
      <span />
      <label className="col-span-3 flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={row.isAssignable} onChange={(e) => onPatch({ isAssignable: e.target.checked })} />{t('levels.assignable')}</label>
    </li>
  );
}

/** Saving: preview first; when data would be affected the impact dialog asks for confirmation, then the save is repeated with it. */
function useLevelsSave(companyId: string, rows: OrgLevelInput[], close: () => void) {
  const { t } = useTranslation('org');
  const [impact, setImpact] = useState<OrgImpactDto | null>(null);
  const preview = usePreviewLevels();
  const save = useSaveLevels();
  const apply = async (decision?: EmployeesDecision) => {
    try {
      await save.mutateAsync({ companyId, levels: rows, ...(impact ? { confirm: { impactToken: impact.impactToken, employees: decision } } : {}) });
      toast.success(t('levels.saved'));
      setImpact(null);
      close();
    } catch (failure) {
      const fresh = (failure as { details?: OrgImpactDto }).details; // the data changed since the preview
      if (fresh?.impactToken) setImpact(fresh);
    }
  };
  const submit = async () => {
    const result = await preview.mutateAsync({ companyId, levels: rows }).catch(() => null);
    if (result?.requiresConfirmation) setImpact(result.impact);
    else if (result) await apply();
  };
  return { impact, setImpact, apply, submit, busy: preview.isPending || save.isPending, error: preview.error ?? save.error, saveError: save.error };
}

/** Form 1: the divisions of the company (sector, department…), in order. */
export function LevelsForm({ companyId, levels, open, onOpenChange }: Props) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const [rows, setRows] = useState<OrgLevelInput[]>(() => levels.map(fromDto));
  const flow = useLevelsSave(companyId, rows, () => onOpenChange(false));
  const patch = (index: number, change: Partial<OrgLevelInput>) => setRows(rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  const move = (index: number, by: -1 | 1) => setRows((prev) => { const next = [...prev]; const [item] = next.splice(index, 1); next.splice(index + by, 0, item as OrgLevelInput); return next; });

  return (
    <>
      <Dialog open={open && !flow.impact} onOpenChange={onOpenChange} title={t('levels.title')} description={t('levels.description')}>
        <div className="flex flex-col gap-4">
          {flow.error && <Alert>{errorMessage(tc, flow.error)}</Alert>}
          <ol className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <LevelRow key={row.id ?? `new-${index}`} row={row} index={index} count={rows.length} onPatch={(c) => patch(index, c)} onMove={(by) => move(index, by)} onRemove={() => setRows(rows.filter((_, i) => i !== index))} />
            ))}
          </ol>
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setRows([...rows, BLANK])}><Plus className="size-4" />{t('levels.add')}</Button>
          {!isValid(rows) && <p className="text-xs text-muted">{t('levels.rules')}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
            <Button disabled={!isValid(rows) || flow.busy} onClick={() => void flow.submit()}>{tc('actions.save')}</Button>
          </div>
        </div>
      </Dialog>
      {flow.impact && <ImpactDialog companyId={companyId} impact={flow.impact} busy={flow.busy} error={flow.saveError ? errorMessage(tc, flow.saveError) : undefined} onCancel={() => flow.setImpact(null)} onConfirm={(d) => void flow.apply(d)} />}
    </>
  );
}
