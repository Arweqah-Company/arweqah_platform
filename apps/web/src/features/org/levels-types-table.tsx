import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLiveError } from '@/shared/lib/live-validation';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';
import { Button, DataTable, Input, RowAction, type Column } from '@/shared/ui';
import { arabicNameProblem, englishNameProblem, type LevelsDraft, type TypeDraft } from './levels-draft';

interface Props {
  draft: LevelsDraft;
  onPatch: (key: string, patch: Partial<TypeDraft>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}

/** The two names of a type; the Arabic one is required and unique, the English one follows it as the person types. */
function NameCells({ row, draft, onPatch, part }: { row: TypeDraft; draft: LevelsDraft; onPatch: Props['onPatch']; part: 'ar' | 'en' }) {
  const { t } = useTranslation('org');
  const arabic = part === 'ar';
  const message = (value: string) => {
    if (arabic) { const p = arabicNameProblem(draft, row.key); return p === 'required' ? t('levels.nameRequired') : p === 'duplicate' ? t('levels.nameDuplicate') : undefined; }
    return englishNameProblem(value) ? t('levels.nameEnRequired') : undefined;
  };
  const live = useLiveError(arabic ? row.nameAr : row.nameEn, message);
  useAutoEnglish(row.nameAr, row.nameEn, (nameEn) => !arabic && onPatch(row.key, { nameEn }));
  return (
    <div className="flex min-w-40 flex-col gap-1">
      <Input aria-label={t(arabic ? 'levels.nameAr' : 'levels.nameEn')} aria-invalid={!!live.error} dir={arabic ? undefined : 'ltr'} onBlur={live.onBlur} value={arabic ? row.nameAr : row.nameEn} onChange={(e) => onPatch(row.key, arabic ? { nameAr: e.target.value } : { nameEn: e.target.value })} />
      {live.error && <p role="alert" className="text-xs text-danger-text">{live.error}</p>}
    </div>
  );
}

/** The types of unit: both names, whether the type takes titles and employees, how many units use it, and removing an added type nobody uses. */
export function LevelsTypesTable({ draft, onPatch, onAdd, onRemove }: Props) {
  const { t } = useTranslation('org');
  const columns: Column<TypeDraft>[] = [
    { id: 'nameAr', header: t('levels.nameAr'), cell: (row) => <NameCells row={row} draft={draft} onPatch={onPatch} part="ar" /> },
    { id: 'nameEn', header: t('levels.nameEn'), cell: (row) => <NameCells row={row} draft={draft} onPatch={onPatch} part="en" /> },
    { id: 'accepts', header: t('levels.accepts'), cell: (row) => <input type="checkbox" className="size-5 accent-petrol-800" aria-label={`${t('levels.accepts')}: ${row.nameAr}`} checked={row.acceptsTitles} disabled={row.key === 'sector'} onChange={(e) => onPatch(row.key, { acceptsTitles: e.target.checked })} /> },
    { id: 'units', header: t('levels.units'), cell: (row) => <span dir="ltr">{row.unitsCount}</span> },
  ];
  return (
    <section aria-labelledby="levels-types" className="flex flex-col gap-3">
      <div>
        <h3 id="levels-types" className="font-bold">{t('levels.typesTitle')}</h3>
        <p className="text-sm text-muted">{t('levels.typesNote')}</p>
      </div>
      <DataTable<TypeDraft>
        caption={t('levels.typesTitle')}
        rows={draft.types}
        rowKey={(row) => row.key}
        columns={columns}
        actions={(row) => (row.isBuiltIn ? <span className="px-2 text-xs text-muted">{t('levels.builtIn')}</span> : <RowAction label={`${t('levels.remove')}: ${row.nameAr || t('levels.newType')}`} icon={Trash2} danger disabled={row.unitsCount > 0} onClick={() => onRemove(row.key)} />)}
      />
      <Button variant="secondary" size="sm" className="self-start" onClick={onAdd}><Plus className="size-4" aria-hidden />{t('levels.add')}</Button>
    </section>
  );
}
