import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Combobox, Dialog, DialogFooter, FormField } from '@/shared/ui';
import { useUnitsByType } from './api';
import { AddTitlesDialog } from './titles-forms';

/** Adding titles from the titles page: first the unit they belong to (only a type that takes titles), then the same form the unit's own tab uses. */
export function AddTitleFlow({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const tree = useUnitsByType().data;
  const [unitId, setUnitId] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);
  const options = useMemo(() => {
    const accepting = new Set((tree?.levels ?? []).filter((l) => l.acceptsTitles).map((l) => l.id));
    return (tree?.nodes ?? []).filter((n) => accepting.has(n.levelId) && n.isActive).map((n) => ({ value: n.id, label: (i18n.language === 'ar' ? n.nameAr : n.nameEn) || n.nameAr, hint: n.code ?? undefined }));
  }, [tree, i18n.language]);
  if (chosen && unitId) return <AddTitlesDialog unitId={unitId} open onOpenChange={(open) => !open && onClose()} />;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('add.title')} description={t('add.description')}>
      <div className="flex flex-col gap-4">
        <FormField label={`${t('add.unit')} *`}>{(p) => <Combobox id={p.id} label={t('add.unit')} value={unitId} options={options} onChange={setUnitId} />}</FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!unitId} onClick={() => setChosen(true)}>{t('add.next')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
