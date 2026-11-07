import type { TaskTagAdminDto, TaskTagInput } from '@arweqah-platform/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, Dialog, FormField, Input, TreeSelect } from '@/shared/ui';
import { useSaveTag, useTagDepartments } from '../api';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';

interface Form {
  orgNodeId: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
}

const fromTag = (tag: TaskTagAdminDto | null): Form => (tag ? { orgNodeId: tag.orgNodeId, nameAr: tag.nameAr, nameEn: tag.nameEn, isActive: tag.isActive } : { orgNodeId: '', nameAr: '', nameEn: '', isActive: true });
const toInput = (f: Form): TaskTagInput => ({ orgNodeId: f.orgNodeId, nameAr: f.nameAr.trim(), nameEn: f.nameEn.trim(), isActive: f.isActive });

function TagFields({ form, set, editing }: { form: Form; set: (change: Partial<Form>) => void; editing: boolean }) {
  const { t, i18n } = useTranslation('tasks');
  const rules = useRules();
  const departments = useTagDepartments(!editing).data;
  const ar = i18n.language === 'ar';
  const items = useMemo(() => (departments ?? []).map((d) => ({ id: d.id, parentId: d.parentId, label: ar ? d.nameAr : d.nameEn, hint: ar ? d.pathAr : d.pathEn })), [departments, ar]);
  const nameAr = useLiveError(form.nameAr, rules.text(2));
  const nameEn = useLiveError(form.nameEn, rules.text(2));
  useAutoEnglish(form.nameAr, form.nameEn, (nameEn) => set({ nameEn }));
  return (
    <>
      {!editing && (
        <FormField label={`${t('tags.department')} *`}>
          {(p) => (
            <TreeSelect label={t('tags.department')} id={p.id} aria-describedby={p['aria-describedby']} aria-required value={form.orgNodeId || null} onChange={(orgNodeId) => set({ orgNodeId })} items={items} />
          )}
        </FormField>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`${t('tags.nameAr')} *`} error={nameAr.error}>{(p) => <Input {...p} maxLength={120} onBlur={nameAr.onBlur} value={form.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />}</FormField>
        <FormField label={`${t('tags.nameEn')} *`} error={nameEn.error}>{(p) => <Input {...p} dir="ltr" maxLength={120} onBlur={nameEn.onBlur} value={form.nameEn} onChange={(e) => set({ nameEn: e.target.value })} />}</FormField>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />{t('tags.active')}</label>
    </>
  );
}

/** Adds or edits a tag of a department. The fields live in their own component so "touched" starts fresh at every opening. */
export function TagDialog({ tag, onClose }: { tag: TaskTagAdminDto | null; onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const save = useSaveTag();
  const [form, setForm] = useState<Form>(() => fromTag(tag));
  const complete = form.orgNodeId !== '' && form.nameAr.trim().length >= 2 && form.nameEn.trim().length >= 2;
  const submit = async () => {
    try {
      await save.mutateAsync({ id: tag?.id, values: toInput(form) });
      toast.success(t('tags.saved'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={tag ? t('tags.editTitle') : t('tags.newTitle')} description={t('tags.dialogDescription')}>
      <div className="flex flex-col gap-4">
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <TagFields form={form} set={(change) => setForm((f) => ({ ...f, ...change }))} editing={!!tag} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={save.isPending || !complete} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
