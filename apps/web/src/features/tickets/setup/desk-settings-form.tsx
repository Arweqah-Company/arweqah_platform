import { DESK_LIMITS, RECEPTION_STATUSES, type ReceptionStatus, type TicketDeskDto, type TicketDeskSettingsInput } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { saveWithToast } from '@/shared/lib/use-save-toast';
import { useLiveError } from '@/shared/lib/live-validation';
import { Alert, Button, FormField, Input, SectionCard, Select, Textarea } from '@/shared/ui';
import { useSaveDesk } from '../api';

type Days = 'defaultDueDays' | 'minLeadDays' | 'autoCloseDays' | 'reopenWindowDays' | 'staleAfterDays';
const DAY_FIELDS: { id: Days; unit: 'working' | 'calendar' }[] = [
  { id: 'defaultDueDays', unit: 'working' },
  { id: 'minLeadDays', unit: 'working' },
  { id: 'autoCloseDays', unit: 'calendar' },
  { id: 'reopenWindowDays', unit: 'calendar' },
  { id: 'staleAfterDays', unit: 'calendar' },
];

type Form = Omit<TicketDeskSettingsInput, 'descriptionAr' | 'descriptionEn'> & { descriptionAr: string; descriptionEn: string };

const toForm = (desk: TicketDeskDto): Form => ({ ...desk.settings, descriptionAr: desk.settings.descriptionAr ?? '', descriptionEn: desk.settings.descriptionEn ?? '' });
const toInput = (f: Form): TicketDeskSettingsInput => ({ ...f, descriptionAr: f.descriptionAr.trim() || null, descriptionEn: f.descriptionEn.trim() || null });

function DaysField({ id, unit, value, onChange }: { id: Days; unit: 'working' | 'calendar'; value: number; onChange: (value: number) => void }) {
  const { t } = useTranslation('tickets');
  const { min, max } = DESK_LIMITS[id];
  const live = useLiveError(value, (v: number) => (Number.isInteger(v) && v >= min && v <= max ? undefined : t('setup.daysRange', { min, max })));
  return (
    <FormField label={t(`setup.days.${id}`)} hint={t(unit === 'working' ? 'setup.workingDays' : 'setup.calendarDays')} error={live.error}>
      {(p) => <Input {...p} type="number" dir="ltr" min={min} max={max} step={1} onBlur={live.onBlur} value={Number.isNaN(value) ? '' : value} onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))} />}
    </FormField>
  );
}

function StatusField({ value, hasManager, onChange }: { value: ReceptionStatus; hasManager: boolean; onChange: (value: ReceptionStatus) => void }) {
  const { t } = useTranslation('tickets');
  return (
    <FormField label={t('setup.reception')} hint={t(`setup.receptionHint.${value}`)} error={value === 'active' && !hasManager ? t('setup.needsManager') : undefined}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value as ReceptionStatus)}>
          {RECEPTION_STATUSES.map((s) => <option key={s} value={s}>{t(`setup.status.${s}`)}</option>)}
        </Select>
      )}
    </FormField>
  );
}

const inRange = (f: Form) => DAY_FIELDS.every(({ id }) => Number.isInteger(f[id]) && f[id] >= DESK_LIMITS[id].min && f[id] <= DESK_LIMITS[id].max);

/** Two sections saved together: reception (status, personal requests, what the sender reads) and the durations the manager decides. */
export function DeskSettingsForm({ desk }: { desk: TicketDeskDto }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const save = useSaveDesk(desk.orgNodeId);
  const [form, setForm] = useState<Form>(() => toForm(desk));
  const set = (change: Partial<Form>) => setForm((f) => ({ ...f, ...change }));
  const valid = inRange(form) && !(form.receptionStatus === 'active' && !desk.manager);
  const submit = saveWithToast(save.mutateAsync, t('setup.saved'));
  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); void submit(toInput(form)); }} noValidate>
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      <SectionCard id="reception" title={t('setup.receptionTitle')} description={t('setup.receptionIntro')}>
        <StatusField value={form.receptionStatus} hasManager={!!desk.manager} onChange={(receptionStatus) => set({ receptionStatus })} />
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={form.acceptsPersonal} onChange={(e) => set({ acceptsPersonal: e.target.checked })} />{t('setup.acceptsPersonal')}</label>
        <FormField label={t('setup.descriptionAr')} hint={t('setup.descriptionHint')}>{(p) => <Textarea {...p} rows={2} maxLength={500} value={form.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} />}</FormField>
        <FormField label={t('setup.descriptionEn')}>{(p) => <Textarea {...p} dir="ltr" rows={2} maxLength={500} value={form.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} />}</FormField>
      </SectionCard>
      <SectionCard id="durations" title={t('setup.durationsTitle')} description={t('setup.durationsIntro')}>
        {DAY_FIELDS.map(({ id, unit }) => <DaysField key={id} id={id} unit={unit} value={form[id]} onChange={(v) => set({ [id]: v } as Partial<Form>)} />)}
      </SectionCard>
      <div><Button type="submit" disabled={save.isPending || !valid}>{tc('actions.save')}</Button></div>
    </form>
  );
}
