import type { CareerContent } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { FormField, Input, Textarea } from '@/shared/ui';
import { EditorBlock, EditorRow, fromLines, removeAt, replaceAt, toLines } from './editor-parts';

type Props = { content: CareerContent; onChange: (next: CareerContent) => void };

/** The job description: the summary, the indicators (one governing) and the responsibilities with their tasks. */
export function DescriptionEditor({ content, onChange }: Props) {
  const { t } = useTranslation('career-profile');
  const set = <K extends keyof CareerContent>(key: K, value: CareerContent[K]) => onChange({ ...content, [key]: value });
  return (
    <div className="flex flex-col gap-4">
      <EditorBlock title={t('editor.summary')}>
        <FormField label={t('editor.summary')} error={content.summary ? undefined : t('editor.required')}>
          {(p) => <Textarea {...p} rows={3} maxLength={2000} value={content.summary} onChange={(e) => set('summary', e.target.value)} />}
        </FormField>
      </EditorBlock>
      <EditorBlock title={t('description.kpis')} onAdd={() => set('kpis', [...content.kpis, { text: '', governing: false }])} addLabel={t('editor.addKpi')}>
        {content.kpis.map((k, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => set('kpis', removeAt(content.kpis, i))}>
            <FormField label={t('editor.kpiText')} error={k.text.trim() ? undefined : t('editor.required')}>
              {(p) => <Input {...p} maxLength={300} value={k.text} onChange={(e) => set('kpis', replaceAt(content.kpis, i, { ...k, text: e.target.value }))} />}
            </FormField>
            <label className="flex items-center gap-2 pb-2 text-sm text-fg">
              <input type="checkbox" className="size-5 accent-petrol-800" checked={k.governing} onChange={(e) => set('kpis', content.kpis.map((x, j) => ({ ...x, governing: j === i ? e.target.checked : false })))} />
              {t('description.governing')}
            </label>
          </EditorRow>
        ))}
      </EditorBlock>
      <EditorBlock title={t('description.responsibilities', { groups: content.responsibilities.length, tasks: content.responsibilities.reduce((n, g) => n + g.tasks.length, 0) })} onAdd={() => set('responsibilities', [...content.responsibilities, { title: '', tasks: [] }])} addLabel={t('editor.addResponsibility')}>
        {content.responsibilities.map((g, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => set('responsibilities', removeAt(content.responsibilities, i))}>
            <FormField label={t('editor.responsibilityTitle')} error={g.title.trim() ? undefined : t('editor.required')}>
              {(p) => <Input {...p} maxLength={200} value={g.title} onChange={(e) => set('responsibilities', replaceAt(content.responsibilities, i, { ...g, title: e.target.value }))} />}
            </FormField>
            <FormField label={t('editor.tasks')} hint={t('editor.oneLinePerItem')}>
              {(p) => <Textarea {...p} rows={3} value={toLines(g.tasks)} onChange={(e) => set('responsibilities', replaceAt(content.responsibilities, i, { ...g, tasks: fromLines(e.target.value) }))} />}
            </FormField>
          </EditorRow>
        ))}
      </EditorBlock>
    </div>
  );
}
