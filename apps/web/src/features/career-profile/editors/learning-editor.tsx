import { durationMinutes, LEARNING_LANGUAGES, LEARNING_PRIORITIES, type CareerContent } from '@arweqah-platform/shared';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, FormField, Input, Select, Textarea } from '@/shared/ui';
import { formatMinutes } from '../format-minutes';
import { EditorBlock, EditorRow, removeAt, replaceAt } from './editor-parts';

type Learning = CareerContent['learning'];
type Period = Learning['periods'][number];
type Unit = Period['units'][number];
type Props = { content: CareerContent; onChange: (next: CareerContent) => void };

const HTTPS = /^https:\/\/\S+$/i;

/** One learning unit: its priority, name, provider, duration (read live into minutes), language and link. */
function UnitRow({ unit, onChange, onRemove }: { unit: Unit; onChange: (next: Unit) => void; onRemove: () => void }) {
  const { t } = useTranslation('career-profile');
  const minutes = durationMinutes(unit.duration);
  const set = (patch: Partial<Unit>) => onChange({ ...unit, ...patch });
  return (
    <EditorRow removeLabel={t('editor.removeUnit')} onRemove={onRemove}>
      <FormField label={t('learning.columns.priority')}>{(p) => <Select {...p} value={unit.priority} onChange={(e) => set({ priority: e.target.value as Unit['priority'] })}>{LEARNING_PRIORITIES.map((x) => <option key={x} value={x}>{x}</option>)}</Select>}</FormField>
      <FormField label={t('learning.columns.unit')} error={unit.title.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={300} value={unit.title} onChange={(e) => set({ title: e.target.value })} />}</FormField>
      <FormField label={t('learning.columns.provider')}>{(p) => <Input {...p} maxLength={300} value={unit.provider} onChange={(e) => set({ provider: e.target.value })} />}</FormField>
      <FormField label={t('learning.columns.duration')} hint={minutes > 0 ? formatMinutes(minutes, t) : undefined} error={minutes > 0 ? undefined : t('editor.durationUnclear')}>
        {(p) => <Input {...p} maxLength={60} value={unit.duration} onChange={(e) => set({ duration: e.target.value, minutes: durationMinutes(e.target.value) })} />}
      </FormField>
      <FormField label={t('learning.columns.language')}>{(p) => <Select {...p} value={unit.language} onChange={(e) => set({ language: e.target.value })}>{LEARNING_LANGUAGES.map((x) => <option key={x} value={x}>{x}</option>)}</Select>}</FormField>
      <FormField label={t('learning.columns.link')} hint={t('editor.linkHint')} error={!unit.link || HTTPS.test(unit.link) ? undefined : t('editor.linkInvalid')}>
        {(p) => <Input {...p} dir="ltr" maxLength={500} placeholder="https://" value={unit.link} onChange={(e) => set({ link: e.target.value.trim() })} />}
      </FormField>
    </EditorRow>
  );
}

/** One period: its name (not empty, not repeated), its units, and an «add a unit» button. */
function PeriodBlock({ period, names, onChange, onRemove }: { period: Period; names: readonly string[]; onChange: (next: Period) => void; onRemove: () => void }) {
  const { t } = useTranslation('career-profile');
  const name = period.name.trim();
  const error = !name ? t('editor.periodRequired') : names.filter((n) => n.trim() === name).length > 1 ? t('editor.periodRepeated') : undefined;
  const addUnit = () => onChange({ ...period, units: [...period.units, { priority: LEARNING_PRIORITIES[0], title: '', provider: '', duration: '', minutes: 0, language: LEARNING_LANGUAGES[0], link: '' }] });
  return (
    <EditorBlock title={period.name || t('editor.newPeriod')} hint={t('learning.periodTotal', { count: period.units.length, duration: formatMinutes(period.units.reduce((n, u) => n + u.minutes, 0), t) })} onAdd={addUnit} addLabel={t('editor.addUnit')}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><FormField label={t('editor.periodName')} error={error}>{(p) => <Input {...p} maxLength={80} value={period.name} onChange={(e) => onChange({ ...period, name: e.target.value })} />}</FormField></div>
        <Button variant="secondary" size="sm" onClick={onRemove}>{t('editor.removePeriod')}</Button>
      </div>
      {period.units.map((u, i) => <UnitRow key={u.id ?? i} unit={u} onChange={(next) => onChange({ ...period, units: replaceAt(period.units, i, next) })} onRemove={() => onChange({ ...period, units: removeAt(period.units, i) })} />)}
    </EditorBlock>
  );
}

/** The learning plan: any number of periods, each with its units; the badges the hours earn and how they are awarded. */
export function LearningEditor({ content, onChange }: Props) {
  const { t } = useTranslation('career-profile');
  const learning = content.learning;
  const set = (next: Partial<Learning>) => onChange({ ...content, learning: { ...learning, ...next } });
  const names = learning.periods.map((p) => p.name);
  return (
    <div className="flex flex-col gap-4">
      {learning.periods.map((p, i) => <PeriodBlock key={i} period={p} names={names} onChange={(next) => set({ periods: replaceAt(learning.periods, i, next) })} onRemove={() => set({ periods: removeAt(learning.periods, i) })} />)}
      <div><Button onClick={() => set({ periods: [...learning.periods, { name: t('editor.periodDefault', { n: learning.periods.length + 1 }), units: [] }] })}><Plus className="size-4" aria-hidden />{t('editor.addPeriod')}</Button></div>
      <EditorBlock title={t('learning.badges')} onAdd={() => set({ badges: [...learning.badges, { name: '', condition: '', hours: 35 }] })} addLabel={t('editor.addBadge')}>
        {learning.badges.map((b, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => set({ badges: removeAt(learning.badges, i) })}>
            <FormField label={t('editor.badgeName')} error={b.name.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={120} value={b.name} onChange={(e) => set({ badges: replaceAt(learning.badges, i, { ...b, name: e.target.value }) })} />}</FormField>
            <FormField label={t('editor.badgeCondition')} error={b.condition.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={300} value={b.condition} onChange={(e) => set({ badges: replaceAt(learning.badges, i, { ...b, condition: e.target.value }) })} />}</FormField>
            <FormField label={t('editor.badgeHours')}>{(p) => <Input {...p} type="number" min={1} max={2000} value={b.hours} onChange={(e) => set({ badges: replaceAt(learning.badges, i, { ...b, hours: Number(e.target.value) || 0 }) })} />}</FormField>
          </EditorRow>
        ))}
        <FormField label={t('editor.badgeRule')}>{(p) => <Textarea {...p} rows={2} maxLength={1000} value={learning.rule} onChange={(e) => set({ rule: e.target.value })} />}</FormField>
      </EditorBlock>
    </div>
  );
}
