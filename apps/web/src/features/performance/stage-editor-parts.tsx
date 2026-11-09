import { useTranslation } from 'react-i18next';
import { removeAt, replaceAt } from '@/shared/lib/array-edit';
import { EditorBlock, EditorRow, FormField, Input, Textarea } from '@/shared/ui';
import { nextBehaviourCode, type StageDraft } from './stage-draft';

interface PartProps {
  draft: StageDraft;
  onChange: (next: StageDraft) => void;
}

const num = (value: string, set: (v: string) => void) => ({ type: 'number' as const, step: 'any', dir: 'ltr' as const, min: 0, max: 100, value, onChange: (e: { target: { value: string } }) => set(e.target.value) });

/** The name and the two weights of the basic part; the basic total follows from them and is shown. */
export function StageBasics({ draft, onChange, basic }: PartProps & { basic: number }) {
  const { t } = useTranslation('performance');
  return (
    <EditorBlock title={t('editor.stage.basics')} hint={t('editor.stage.basicTotal', { total: basic })}>
      <EditorRow>
        <FormField label={t('editor.stage.name')}>{(p) => <Input {...p} aria-required maxLength={120} value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />}</FormField>
        <FormField label={t('editor.stage.resultsWeight')}>{(p) => <Input {...p} aria-required {...num(draft.resultsWeight, (v) => onChange({ ...draft, resultsWeight: v }))} />}</FormField>
        <FormField label={t('editor.stage.behaviourWeight')}>{(p) => <Input {...p} aria-required {...num(draft.behaviourWeight, (v) => onChange({ ...draft, behaviourWeight: v }))} />}</FormField>
      </EditorRow>
      <FormField label={t('editor.stage.ruleText')}>{(p) => <Textarea {...p} rows={2} maxLength={600} value={draft.ruleText} onChange={(e) => onChange({ ...draft, ruleText: e.target.value })} />}</FormField>
    </EditorBlock>
  );
}

/** The extra components (learning, initiatives, growth…): a name and its points each; the cap is the basic total plus their points and is shown. */
export function ExtraEditor({ draft, onChange, cap }: PartProps & { cap: number }) {
  const { t } = useTranslation('performance');
  return (
    <EditorBlock title={t('editor.stage.extra')} hint={t('editor.stage.cap', { cap })} onAdd={() => onChange({ ...draft, extra: [...draft.extra, { name: '', points: '' }] })} addLabel={t('editor.stage.addExtra')}>
      {draft.extra.map((e, i) => (
        <EditorRow key={i} onRemove={() => onChange({ ...draft, extra: removeAt(draft.extra, i) })} removeLabel={t('editor.remove')}>
          <FormField label={t('editor.stage.extraName')}>{(p) => <Input {...p} aria-required maxLength={120} value={e.name} onChange={(ev) => onChange({ ...draft, extra: replaceAt(draft.extra, i, { ...e, name: ev.target.value }) })} />}</FormField>
          <FormField label={t('editor.stage.points')}>{(p) => <Input {...p} aria-required {...num(e.points, (v) => onChange({ ...draft, extra: replaceAt(draft.extra, i, { ...e, points: v }) }))} />}</FormField>
        </EditorRow>
      ))}
    </EditorBlock>
  );
}

/** The results criteria: a name and a share each; the shares must add up to 100 and their sum is shown. */
export function CriteriaEditor({ draft, onChange, shares }: PartProps & { shares: number }) {
  const { t } = useTranslation('performance');
  return (
    <EditorBlock title={t('editor.stage.criteria')} hint={t('editor.stage.sharesSum', { sum: shares })} onAdd={() => onChange({ ...draft, criteria: [...draft.criteria, { name: '', share: '' }] })} addLabel={t('editor.stage.addCriterion')}>
      <FormField label={t('editor.stage.resultsNote')}>{(p) => <Textarea {...p} rows={2} maxLength={1000} value={draft.resultsNote} onChange={(e) => onChange({ ...draft, resultsNote: e.target.value })} />}</FormField>
      {draft.criteria.map((c, i) => (
        <EditorRow key={i} onRemove={() => onChange({ ...draft, criteria: removeAt(draft.criteria, i) })} removeLabel={t('editor.remove')}>
          <FormField label={t('editor.stage.criterionName')}>{(p) => <Input {...p} aria-required maxLength={160} value={c.name} onChange={(ev) => onChange({ ...draft, criteria: replaceAt(draft.criteria, i, { ...c, name: ev.target.value }) })} />}</FormField>
          <FormField label={t('editor.stage.share')}>{(p) => <Input {...p} aria-required {...num(c.share, (v) => onChange({ ...draft, criteria: replaceAt(draft.criteria, i, { ...c, share: v }) }))} />}</FormField>
        </EditorRow>
      ))}
    </EditorBlock>
  );
}

/** The behaviours: a code (suggested), a name and the question the evaluator is asked. */
export function BehavioursEditor({ draft, onChange, stage }: PartProps & { stage: number }) {
  const { t } = useTranslation('performance');
  const add = () => onChange({ ...draft, behaviours: [...draft.behaviours, { code: nextBehaviourCode(stage, draft.behaviours), name: '', question: '' }] });
  return (
    <EditorBlock title={t('editor.stage.behaviours')} onAdd={add} addLabel={t('editor.stage.addBehaviour')}>
      {draft.behaviours.map((b, i) => (
        <EditorRow key={i} onRemove={() => onChange({ ...draft, behaviours: removeAt(draft.behaviours, i) })} removeLabel={t('editor.remove')}>
          <FormField label={t('editor.stage.code')}>{(p) => <Input {...p} aria-required dir="ltr" maxLength={20} value={b.code} onChange={(ev) => onChange({ ...draft, behaviours: replaceAt(draft.behaviours, i, { ...b, code: ev.target.value }) })} />}</FormField>
          <FormField label={t('editor.stage.behaviourName')}>{(p) => <Input {...p} aria-required maxLength={160} value={b.name} onChange={(ev) => onChange({ ...draft, behaviours: replaceAt(draft.behaviours, i, { ...b, name: ev.target.value }) })} />}</FormField>
          <FormField label={t('editor.stage.question')}>{(p) => <Textarea {...p} aria-required rows={2} maxLength={600} value={b.question} onChange={(ev) => onChange({ ...draft, behaviours: replaceAt(draft.behaviours, i, { ...b, question: ev.target.value }) })} />}</FormField>
        </EditorRow>
      ))}
    </EditorBlock>
  );
}
