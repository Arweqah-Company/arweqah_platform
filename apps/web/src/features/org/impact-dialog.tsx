import type { EmployeesDecision, OrgImpactDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Combobox, Dialog, FormField, Input, Select } from '@/shared/ui';
import { useJobTitleOptions, useOrgNodeOptions } from '../employees/api';

type Choice = 'transfer' | 'delete';

/** What the user decided for the employees of the units that will go. */
function useDecision(impact: OrgImpactDto) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});
  const [typed, setTyped] = useState('');
  const mapped = impact.titlesWithEmployees.every((x) => titleMap[x.id]);
  const complete = choice === 'delete' ? typed.trim() === String(impact.employeesCount) : choice === 'transfer' && !!unitId && mapped;
  const decision = (): EmployeesDecision | undefined => {
    if (choice === 'delete') return { action: 'delete', confirmCount: impact.employeesCount };
    return unitId ? { action: 'transfer', unitId, titleMap } : undefined;
  };
  return { choice, setChoice, unitId, setUnitId, titleMap, setTitleMap, typed, setTyped, complete, decision };
}

type Decision = ReturnType<typeof useDecision>;

function TransferChoice({ companyId, impact, d }: { companyId: string; impact: OrgImpactDto; d: Decision }) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const units = useOrgNodeOptions(companyId);
  const targetTitles = useJobTitleOptions(d.unitId ?? undefined);
  const removed = new Set(impact.units.map((u) => u.id));
  const unitOptions = (units.data ?? []).filter((u) => !removed.has(u.id)).map((u) => ({ value: u.id, label: ar ? u.pathAr : u.pathEn }));
  return (
    <div className="flex flex-col gap-3 ps-6">
      <FormField label={t('impact.targetUnit')}>
        {(p) => <Combobox id={p.id} label={t('impact.targetUnit')} value={d.unitId} options={unitOptions} onChange={(v) => { d.setUnitId(v); d.setTitleMap({}); }} />}
      </FormField>
      {d.unitId && impact.titlesWithEmployees.map((x) => (
        <FormField key={x.id} label={t('impact.mapTitle', { title: ar ? x.nameAr : x.nameEn, count: x.employeesCount })}>
          {(p) => (
            <Select {...p} value={d.titleMap[x.id] ?? ''} onChange={(e) => d.setTitleMap({ ...d.titleMap, [x.id]: e.target.value })}>
              <option value="">{t('impact.chooseTitle')}</option>
              {(targetTitles.data ?? []).map((o) => <option key={o.id} value={o.id}>{ar ? o.nameAr : o.nameEn}</option>)}
            </Select>
          )}
        </FormField>
      ))}
    </div>
  );
}

function DeleteChoice({ count, d }: { count: number; d: Decision }) {
  const { t } = useTranslation('org');
  return (
    <div className="flex flex-col gap-2 ps-6">
      <Alert>{t('impact.deleteWarning', { count })}</Alert>
      <FormField label={t('impact.typeCount')}>{(p) => <Input {...p} dir="ltr" inputMode="numeric" autoComplete="off" value={d.typed} onChange={(e) => d.setTyped(e.target.value)} />}</FormField>
    </div>
  );
}

interface Props {
  companyId: string;
  impact: OrgImpactDto;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (decision: EmployeesDecision | undefined) => void;
}

/** Shows what a change to the levels would remove, and what happens to the employees in those units. */
export function ImpactDialog({ companyId, impact, busy, error, onCancel, onConfirm }: Props) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const d = useDecision(impact);
  const hasEmployees = impact.employeesCount > 0;
  const radio = (value: Choice, label: string, accent: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="radio" name="choice" className={accent} checked={d.choice === value} onChange={() => d.setChoice(value)} />{label}</label>
  );
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()} title={t('impact.title')} description={t('impact.description')}>
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Alert tone="warning">{t('impact.summary', { units: impact.unitsCount, titles: impact.jobTitlesCount, employees: impact.employeesCount })}</Alert>
        {impact.units.length > 0 && <ul className="max-h-32 list-disc overflow-y-auto ps-5 text-sm">{impact.units.map((u) => <li key={u.id}>{ar ? u.pathAr : u.pathEn}</li>)}</ul>}
        {hasEmployees && (
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-bold">{t('impact.employeesQuestion', { count: impact.employeesCount })}</legend>
            {radio('transfer', t('impact.transfer'), 'accent-petrol-800')}
            {d.choice === 'transfer' && <TransferChoice companyId={companyId} impact={impact} d={d} />}
            {radio('delete', t('impact.delete'), 'accent-danger-700')}
            {d.choice === 'delete' && <DeleteChoice count={impact.employeesCount} d={d} />}
          </fieldset>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>{t('impact.cancel')}</Button>
          <Button variant="danger" disabled={busy || (hasEmployees && !d.complete)} onClick={() => onConfirm(hasEmployees ? d.decision() : undefined)}>{t('impact.confirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
