import { CAREER_LEVELS, type CareerContent } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { FormField, Input, Select } from '@/shared/ui';
import { EditorBlock, EditorRow, removeAt, replaceAt } from './editor-parts';

type Props = { content: CareerContent; onChange: (next: CareerContent) => void };

/** The career ladder (one level marked as the current title), the condition to move up, and the steps of the level path. */
export function PathEditor({ content, onChange }: Props) {
  const { t } = useTranslation('career-profile');
  const set = <K extends keyof CareerContent>(key: K, value: CareerContent[K]) => onChange({ ...content, [key]: value });
  const nextLevel = CAREER_LEVELS.find((l) => !content.ladder.some((s) => s.level === l)) ?? CAREER_LEVELS[0];
  return (
    <div className="flex flex-col gap-4">
      <EditorBlock title={t('development.ladder')} hint={t('editor.ladderHint')} onAdd={() => set('ladder', [...content.ladder, { level: nextLevel, title: '', current: content.ladder.length === 0 }])} addLabel={t('editor.addLevel')}>
        {content.ladder.map((s, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => set('ladder', removeAt(content.ladder, i))}>
            <FormField label={t('editor.level')}>
              {(p) => <Select {...p} value={s.level} onChange={(e) => set('ladder', replaceAt(content.ladder, i, { ...s, level: e.target.value as typeof s.level }))}>{CAREER_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select>}
            </FormField>
            <FormField label={t('editor.levelTitle')} error={s.title.trim() ? undefined : t('editor.required')}>
              {(p) => <Input {...p} maxLength={120} value={s.title} onChange={(e) => set('ladder', replaceAt(content.ladder, i, { ...s, title: e.target.value }))} />}
            </FormField>
            <label className="flex items-center gap-2 pb-2 text-sm text-fg">
              <input type="radio" name="current-title" className="size-5 accent-petrol-800" checked={s.current} onChange={() => set('ladder', content.ladder.map((x, j) => ({ ...x, current: j === i })))} />
              {t('development.current')}
            </label>
          </EditorRow>
        ))}
      </EditorBlock>
      <EditorBlock title={t('development.condition')}>
        <FormField label={t('development.condition')} error={content.transitionRule.trim() ? undefined : t('editor.required')}>
          {(p) => <Input {...p} maxLength={600} value={content.transitionRule} onChange={(e) => set('transitionRule', e.target.value)} />}
        </FormField>
      </EditorBlock>
      <EditorBlock title={t('development.sub.path')} onAdd={() => set('steps', [...content.steps, { n: Math.min(9, content.steps.length + 1), label: '', title: '', meta: '' }])} addLabel={t('editor.addStep')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('editor.pathUnit')}>{(p) => <Input {...p} maxLength={200} value={content.pathUnit} onChange={(e) => set('pathUnit', e.target.value)} />}</FormField>
          <FormField label={t('editor.pathTitle')}>{(p) => <Input {...p} maxLength={200} value={content.pathTitle} onChange={(e) => set('pathTitle', e.target.value)} />}</FormField>
        </div>
        {content.steps.map((s, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => set('steps', removeAt(content.steps, i).map((x, j) => ({ ...x, n: j + 1 })))}>
            <FormField label={t('editor.stepLabel', { n: s.n })} error={s.label.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={80} value={s.label} onChange={(e) => set('steps', replaceAt(content.steps, i, { ...s, label: e.target.value }))} />}</FormField>
            <FormField label={t('editor.stepTitle')} error={s.title.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={300} value={s.title} onChange={(e) => set('steps', replaceAt(content.steps, i, { ...s, title: e.target.value }))} />}</FormField>
            <FormField label={t('editor.stepMeta')} error={s.meta.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={300} value={s.meta} onChange={(e) => set('steps', replaceAt(content.steps, i, { ...s, meta: e.target.value }))} />}</FormField>
          </EditorRow>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('development.output')}>{(p) => <Input {...p} maxLength={600} value={content.output} onChange={(e) => set('output', e.target.value)} />}</FormField>
          <FormField label={t('development.certificates')}>{(p) => <Input {...p} maxLength={600} value={content.certificates} onChange={(e) => set('certificates', e.target.value)} />}</FormField>
        </div>
      </EditorBlock>
    </div>
  );
}
