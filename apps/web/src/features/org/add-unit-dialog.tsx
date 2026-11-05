import { unitStartDateIsValid, type OrgTreeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';
import { Alert, Button, Combobox, Dialog, DialogFooter, FormField, Input, Select } from '@/shared/ui';
import { UnitCode } from './unit-badges';
import { ManagementModeCards } from './management-mode-cards';
import { nodeName } from './org-model';
import { useAddUnit, type AddUnitState } from './use-add-unit';
import type { ModeChoice } from './add-unit-rules';

const ROOT_VALUE = 'root';

/** Where the unit goes and what it is: the parent (the group or a unit), its type (only what the rules allow there) and the code letters when it sits under the group. */
function PlacementFields({ f }: { f: AddUnitState }) {
  const { t, i18n } = useTranslation('org');
  const rules = useRules();
  const ar = i18n.language === 'ar';
  const prefix = useLiveError(f.prefix, rules.pattern(/^[A-Z]{3}$/, t('add.prefixInvalid')));
  const options = f.choices.map(({ node, depth }) => ({ value: node?.id ?? ROOT_VALUE, label: node ? `${'— '.repeat(depth)}${nodeName(node, ar)}` : t('add.underGroup') }));
  const typeError = f.allowed.length === 0 ? t('add.noTypes') : f.code.problem === 'noSlot' || f.code.problem === 'parentNoCode' ? t(`add.${f.code.problem}`) : undefined;
  return (
    <>
      <FormField label={`${t('add.parent')} *`}>{(p) => <Combobox id={p.id} label={t('add.parent')} value={f.parentId ?? ROOT_VALUE} options={options} onChange={(v) => f.setParentId(!v || v === ROOT_VALUE ? null : v)} />}</FormField>
      <FormField label={`${t('table.type')} *`} error={typeError}>
        {(p) => (
          <Select {...p} value={f.level?.id ?? ''} onChange={(e) => f.setLevelId(e.target.value)}>
            {f.allowed.map((l) => <option key={l.id} value={l.id}>{ar ? l.nameAr : l.nameEn}</option>)}
          </Select>
        )}
      </FormField>
      {f.parent === null && (
        <FormField label={`${t('add.prefix')} *`} hint={t('add.prefixHint')} error={prefix.error}>
          {(p) => <Input {...p} dir="ltr" maxLength={3} placeholder="OPS" onBlur={prefix.onBlur} value={f.prefix} onChange={(e) => f.setPrefix(e.target.value.toUpperCase())} />}
        </FormField>
      )}
    </>
  );
}

/** The names (English follows the Arabic as the person types, and stays optional) and the day the unit starts. */
function NameFields({ f }: { f: AddUnitState }) {
  const { t } = useTranslation('org');
  const rules = useRules();
  const nameAr = useLiveError(f.names.nameAr, rules.text(2));
  const start = useLiveError(f.startDate, (v: string) => rules.required(v) ?? (unitStartDateIsValid(v) ? undefined : t('node.startInvalid')));
  useAutoEnglish(f.names.nameAr, f.names.nameEn, (nameEn) => f.setNames({ ...f.names, nameEn }));
  return (
    <>
      <FormField label={`${t('node.nameAr')} *`} error={nameAr.error}>{(p) => <Input {...p} onBlur={nameAr.onBlur} value={f.names.nameAr} onChange={(e) => f.setNames({ ...f.names, nameAr: e.target.value })} />}</FormField>
      <FormField label={t('node.nameEn')} hint={t('add.nameEnHint')}>{(p) => <Input {...p} dir="ltr" value={f.names.nameEn} onChange={(e) => f.setNames({ ...f.names, nameEn: e.target.value })} />}</FormField>
      <FormField label={`${t('node.startDate')} *`} hint={t('node.startHint')} error={start.error}>{(p) => <Input {...p} type="date" dir="ltr" onBlur={start.onBlur} value={f.startDate} onChange={(e) => f.setStartDate(e.target.value)} />}</FormField>
    </>
  );
}

/** «Inherit / shared / per company» as cards; a unit directly under the group has nothing to inherit from, so it only offers the two. */
function ModeSection({ f }: { f: AddUnitState }) {
  const { t } = useTranslation('org');
  const inherited = f.parent ? t(f.parent.effectiveMode === 'shared' ? 'mode.shared' : 'mode.perCompany') : '';
  const cards = [
    ...(f.parent ? [{ id: 'inherit' as const, title: t('add.modeInherit'), description: t('add.modeInheritNow', { mode: inherited }) }] : []),
    { id: 'shared' as const, title: t('mode.shared'), description: t('add.modeSharedText') },
    { id: 'per_company' as const, title: t('mode.perCompany'), description: t('add.modePerCompanyText') },
  ];
  return <ManagementModeCards<Exclude<ModeChoice, ''>> name="management-mode" label={`${t('table.mode')} *`} value={f.choice as Exclude<ModeChoice, ''> | ''} onChange={f.setMode} options={cards} />;
}

/** The suggested code and who will see the unit, in a note under the form. */
function CodeNote({ f }: { f: AddUnitState }) {
  const { t } = useTranslation('org');
  const sees = f.effectiveMode === 'shared' ? t('add.seesShared') : t('add.seesPerCompany');
  return (
    <Alert tone="info">
      <p>{t('add.suggestedCode')} {f.code.code ? <UnitCode code={f.code.code} /> : <span className="text-muted">{t(f.code.problem ? `add.codeNone.${f.code.problem}` : 'add.codeNone.pending')}</span>}</p>
      {f.effectiveMode && <p className="mt-1">{sees}</p>}
    </Alert>
  );
}

/** Adds a unit: parent, type limited by the rules table, names, management type as cards, and the code it would get. */
export function AddUnitDialog({ tree, parentId, onClose }: { tree: OrgTreeDto; parentId: string | null; onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const f = useAddUnit(tree, parentId, onClose);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} wide title={t('add.title')} description={t('add.description')}>
      <div className="flex flex-col gap-4">
        {f.create.isError && <Alert>{errorMessage(tc, f.create.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <PlacementFields f={f} />
          <NameFields f={f} />
        </div>
        <ModeSection f={f} />
        <CodeNote f={f} />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!f.valid || f.create.isPending} onClick={() => void f.submit()}>{t('add.save')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
