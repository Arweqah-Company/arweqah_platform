import { BEHAVIOUR_LEVELS, levelNeedsNote, SELF_ACHIEVEMENT_MAX, SELF_NOTE_MAX, SELF_NOTE_MIN, type CatalogItemDto, type MyEvaluationDto, type SaveSelfEvaluationInput } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Badge, Button, FormField, Select, Textarea } from '@/shared/ui';
import { formatHours } from './format-hours';
import { useSaveSelf, useSendSelf } from './api';

type Evaluation = NonNullable<MyEvaluationDto['evaluation']>;
type Behaviours = SaveSelfEvaluationInput['behaviours'];

/** The fields of one behaviour: its level (the same five steps the manager uses) and a note, which the two ends and «rarely» ask for. */
function BehaviourField({ code, name, question, value, tried, onChange }: { code: string; name: string; question: string; value: Behaviours[string] | undefined; tried: boolean; onChange: (next: Behaviours[string]) => void }) {
  const { t } = useTranslation('performance');
  const level = value?.level;
  const note = value?.note ?? '';
  const needs = level !== undefined && levelNeedsNote(level) && note.trim().length < SELF_NOTE_MIN;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
      <b className="text-fg">{name}</b>
      <span className="text-sm text-muted">{question}</span>
      <FormField label={t('self.level')} error={tried && level === undefined ? t('self.levelRequired') : undefined}>
        {(p) => (
          <Select {...p} value={level === undefined ? '' : String(level)} onChange={(e) => onChange({ note, level: e.target.value === '' ? undefined : Number(e.target.value) })}>
            <option value="">{t('self.choose')}</option>
            {BEHAVIOUR_LEVELS.map((l) => <option key={l} value={l}>{t(`self.levels.${l}`)}</option>)}
          </Select>
        )}
      </FormField>
      <FormField label={t('self.note')} hint={t('self.noteHint')} error={tried && needs ? t('self.noteShort', { min: SELF_NOTE_MIN }) : undefined}>
        {(p) => <Textarea {...p} rows={2} maxLength={SELF_NOTE_MAX} aria-label={`${t('self.note')}: ${code}`} value={note} onChange={(e) => onChange({ level, note: e.target.value })} />}
      </FormField>
    </div>
  );
}

/** The catalog items of one kind as check boxes with their points. */
function Picks({ title, items, picked, onChange }: { title: string; items: CatalogItemDto[]; picked: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation('performance');
  return (
    <fieldset className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
      <legend className="px-1 font-bold text-fg">{title}</legend>
      {items.length === 0 && <p className="text-sm text-muted">{t('self.noItems')}</p>}
      {items.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-fg">
          <input type="checkbox" className="size-4 accent-petrol-800" checked={picked.includes(c.id)} onChange={(e) => onChange(e.target.checked ? [...picked, c.id] : picked.filter((x) => x !== c.id))} />
          {c.title}<Badge tone="neutral">{t('self.points', { count: c.points })}</Badge>
        </label>
      ))}
    </fieldset>
  );
}

/** The form is complete: every behaviour rated and a note where the level asks for one (the server checks the same). */
export function isComplete(evaluation: Evaluation, form: SaveSelfEvaluationInput): boolean {
  return evaluation.template.behaviours.every((b) => {
    const v = form.behaviours[b.code];
    return v?.level !== undefined && (!levelNeedsNote(v.level) || v.note.trim().length >= SELF_NOTE_MIN);
  });
}

/** The self-evaluation form: the behaviours, the achievements for each results criterion (no score), the learning card and the picks from the catalog. */
export function SelfForm({ evaluation, onClose }: { evaluation: Evaluation; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const { sentAt: sent, ...saved } = evaluation.self;
  const [form, setForm] = useState<SaveSelfEvaluationInput>(saved);
  const [tried, setTried] = useState(false);
  const save = useSaveSelf();
  const send = useSendSelf();
  const kind = (k: CatalogItemDto['kind']) => evaluation.catalog.filter((c) => c.kind === k);
  const submit = () => {
    setTried(true);
    if (isComplete(evaluation, form)) send.mutate(form, { onSuccess: () => { toast.success(t(sent ? 'self.edited' : 'self.sentDone')); onClose(); } });
  };
  const draft = () => save.mutate(form, { onSuccess: () => { toast.success(t('self.draftSaved')); onClose(); } });
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t('self.intro')}{sent && <b> {t('self.introSent')}</b>}</Alert>
      <h3 className="font-heading text-base font-bold text-fg">{t('self.behavioursTitle')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {evaluation.template.behaviours.map((b) => <BehaviourField key={b.code} code={b.code} name={b.name} question={b.question} value={form.behaviours[b.code]} tried={tried} onChange={(next) => setForm({ ...form, behaviours: { ...form.behaviours, [b.code]: next } })} />)}
      </div>
      <h3 className="font-heading text-base font-bold text-fg">{t('self.achievementsTitle')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {evaluation.template.criteria.map((c, i) => (
          <FormField key={c.name} label={`${c.name} (${c.share}%)`}>{(p) => <Textarea {...p} rows={3} maxLength={SELF_ACHIEVEMENT_MAX} placeholder={t('self.achievementHint')} value={form.achievements[String(i)] ?? ''} onChange={(e) => setForm({ ...form, achievements: { ...form.achievements, [String(i)]: e.target.value } })} />}</FormField>
        ))}
      </div>
      <h3 className="font-heading text-base font-bold text-fg">{t('evaluation.extra')}</h3>
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3"><b className="text-fg">{evaluation.template.extra[0]?.name ?? t('self.learning')} ({t('self.auto')})</b><p className="text-sm text-muted">{t('self.learningCard', { done: formatHours(evaluation.learning.approvedMinutes), of: formatHours(evaluation.learning.stageMinutes) })}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Picks title={t('catalog.kinds.init')} items={kind('init')} picked={form.initIds} onChange={(initIds) => setForm({ ...form, initIds })} />
        <Picks title={t('catalog.kinds.growth')} items={kind('growth')} picked={form.growthIds} onChange={(growthIds) => setForm({ ...form, growthIds })} />
      </div>
      {(send.isError || save.isError) && <Alert tone="danger">{t('self.failed')}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onClose}>{t('self.back')}</Button>
        {!sent && <Button variant="secondary" disabled={save.isPending} onClick={draft}>{t('self.saveDraft')}</Button>}
        <Button disabled={send.isPending} onClick={submit}>{t(sent ? 'self.saveEdit' : 'self.send')}</Button>
      </div>
    </div>
  );
}
