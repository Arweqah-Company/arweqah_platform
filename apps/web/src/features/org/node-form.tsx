import type { OrgNodeDto, OrgTreeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, Dialog, FormField, Input, Select } from '@/shared/ui';
import { JobTitleRows } from './job-title-rows';
import { useNodeForm, type NodeFormState } from './use-node-form';

interface Props {
  tree: OrgTreeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing unit keeps its level and parent; creating picks them. */
  editing?: OrgNodeDto;
  initialParentId?: string | null;
}

function PlacementFields({ tree, f }: { tree: OrgTreeDto; f: NodeFormState }) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  return (
    <>
      <FormField label={`${t('node.level')} *`}>
        {(p) => (
          <Select {...p} value={f.levelId} onChange={(e) => f.setLevelId(e.target.value)}>
            {tree.levels.map((l) => <option key={l.id} value={l.id}>{ar ? l.nameAr : l.nameEn}</option>)}
          </Select>
        )}
      </FormField>
      {f.levelIndex > 0 && (
        <FormField label={`${t('node.parent', { level: ar ? f.parentLevel?.nameAr : f.parentLevel?.nameEn })} *`}>
          {(p) => <Combobox id={p.id} label={t('node.parentLabel')} value={f.parentId} options={f.parentOptions} onChange={f.setParentId} />}
        </FormField>
      )}
    </>
  );
}

function DetailsFields({ f, editing }: { f: NodeFormState; editing: boolean }) {
  const { t } = useTranslation('org');
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`${t('node.nameAr')} *`}>{(p) => <Input {...p} value={f.names.nameAr} onChange={(e) => f.setNames({ ...f.names, nameAr: e.target.value })} />}</FormField>
        <FormField label={`${t('node.nameEn')} *`}>{(p) => <Input {...p} dir="ltr" value={f.names.nameEn} onChange={(e) => f.setNames({ ...f.names, nameEn: e.target.value })} />}</FormField>
      </div>
      <FormField label={t('node.manager')} hint={t('node.managerHint')}>
        {(p) => <Combobox id={p.id} label={t('node.manager')} value={f.managerId} options={f.managerOptions} onSearch={f.setSearch} onChange={f.setManagerId} clearable />}
      </FormField>
      {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={f.isActive} onChange={(e) => f.setIsActive(e.target.checked)} />{t('node.active')}</label>}
    </>
  );
}

/** Form 2: add a unit under any division (parent = a unit of the division right above), with its job titles. */
export function NodeForm({ tree, open, onOpenChange, editing, initialParentId }: Props) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const f = useNodeForm({ tree, editing, initialParentId, close: () => onOpenChange(false) });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={editing ? t('node.editTitle') : t('node.title')} description={editing ? undefined : t('node.description')}>
      <div className="flex flex-col gap-4">
        {f.mutation.isError && <Alert>{errorMessage(tc, f.mutation.error)}</Alert>}
        {!editing && <PlacementFields tree={tree} f={f} />}
        <DetailsFields f={f} editing={!!editing} />
        {f.needsTitles && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-bold">{t('node.titlesRequired')}</legend>
            <JobTitleRows rows={f.titles} onChange={f.setTitles} minimum={1} />
          </fieldset>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={!f.valid || f.mutation.isPending} onClick={() => void f.submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
