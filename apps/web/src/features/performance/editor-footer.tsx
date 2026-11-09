import { useTranslation } from 'react-i18next';
import { Button, DialogFooter } from '@/shared/ui';

/** The buttons under an editor dialog: save (off only while it saves) and cancel. */
export function EditorFooter({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  const { t } = useTranslation('performance');
  return (
    <DialogFooter>
      <Button disabled={saving} onClick={onSave}>{t('editor.save')}</Button>
      <Button variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
    </DialogFooter>
  );
}
