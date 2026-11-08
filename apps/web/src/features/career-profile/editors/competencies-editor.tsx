import { COMPETENCY_VALUES } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { FormField, Input, Select } from '@/shared/ui';
import { EditorBlock, EditorRow, removeAt, replaceAt, contentSetter, type EditorProps } from './editor-parts';

/** The technical competencies: the levels they are asked at (columns) and, for each competency, its value at each level. */
export function CompetenciesEditor({ content, onChange }: EditorProps) {
  const { t } = useTranslation('career-profile');
  const columns = content.competencyColumns;
  const set = contentSetter(content, onChange);
  const addColumn = () => onChange({ ...content, competencyColumns: [...columns, ''], competencies: content.competencies.map((c) => ({ ...c, values: [...c.values, COMPETENCY_VALUES[3]] })) });
  const removeColumn = (i: number) => onChange({ ...content, competencyColumns: removeAt(columns, i), competencies: content.competencies.map((c) => ({ ...c, values: removeAt(c.values, i) })) });
  return (
    <div className="flex flex-col gap-4">
      <EditorBlock title={t('editor.columns')} hint={t('editor.columnsHint')} onAdd={addColumn} addLabel={t('editor.addColumn')}>
        {columns.map((c, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => removeColumn(i)}>
            <FormField label={t('editor.columnName', { n: i + 1 })} error={c.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={40} value={c} onChange={(e) => set('competencyColumns', replaceAt(columns, i, e.target.value))} />}</FormField>
          </EditorRow>
        ))}
      </EditorBlock>
      <EditorBlock title={t('development.competencies')} onAdd={() => set('competencies', [...content.competencies, { name: '', values: columns.map(() => COMPETENCY_VALUES[3]) }])} addLabel={t('editor.addCompetency')}>
        {content.competencies.map((c, i) => (
          <EditorRow key={i} removeLabel={t('editor.remove')} onRemove={() => set('competencies', removeAt(content.competencies, i))}>
            <FormField label={t('development.competency')} error={c.name.trim() ? undefined : t('editor.required')}>{(p) => <Input {...p} maxLength={120} value={c.name} onChange={(e) => set('competencies', replaceAt(content.competencies, i, { ...c, name: e.target.value }))} />}</FormField>
            {columns.map((col, j) => (
              <FormField key={j} label={col || t('editor.valueAt', { n: j + 1 })}>
                {(p) => <Select {...p} value={c.values[j] ?? COMPETENCY_VALUES[3]} onChange={(e) => set('competencies', replaceAt(content.competencies, i, { ...c, values: replaceAt(c.values, j, e.target.value) }))}>{COMPETENCY_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}</Select>}
              </FormField>
            ))}
          </EditorRow>
        ))}
      </EditorBlock>
    </div>
  );
}
