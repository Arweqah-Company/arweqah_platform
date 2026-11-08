import { useTranslation } from 'react-i18next';
import { FormField, Input, Textarea } from '@/shared/ui';
import { EditorBlock, EditorRow, LinesTextarea, removeAt, replaceAt, contentSetter, type EditorProps } from './editor-parts';

/** The required actions (each with a heading, its lines and the last day) and the acknowledgement sentence. */
export function RequiredEditor({ content, onChange }: EditorProps) {
  const { t } = useTranslation('career-profile');
  const set = contentSetter(content, onChange);
  return (
    <div className="flex flex-col gap-4">
      <EditorBlock title={t('sections.required')} onAdd={() => set('required', [...content.required, { when: '', lines: [], deadline: null }])} addLabel={t('editor.addRequired')}>
        {content.required.map((r, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => set('required', removeAt(content.required, i))}>
            <FormField label={t('editor.when')} error={r.when.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={160} value={r.when} onChange={(e) => set('required', replaceAt(content.required, i, { ...r, when: e.target.value }))} />}</FormField>
            <FormField label={t('editor.requiredLines')} hint={t('editor.oneLinePerItem')} error={r.lines.length ? undefined : t('editor.required')}>{(p) => <LinesTextarea {...p} rows={3} lines={r.lines} onLines={(lines) => set('required', replaceAt(content.required, i, { ...r, lines }))} />}</FormField>
            <FormField label={t('editor.deadline')} hint={t('editor.deadlineHint')}>{(p) => <Input {...p} type="date" dir="ltr" value={r.deadline ?? ''} onChange={(e) => set('required', replaceAt(content.required, i, { ...r, deadline: e.target.value || null }))} />}</FormField>
          </EditorRow>
        ))}
      </EditorBlock>
      <EditorBlock title={t('required.ackText')}>
        <FormField label={t('required.ackText')} error={content.ackText.trim() ? undefined : t('editor.required')}>{(p) => <Textarea {...p} rows={2} maxLength={500} value={content.ackText} onChange={(e) => set('ackText', e.target.value)} />}</FormField>
      </EditorBlock>
    </div>
  );
}
