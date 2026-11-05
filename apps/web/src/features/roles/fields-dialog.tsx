import { DEFAULT_EDITABLE_FIELDS, EMPLOYEE_FIELD_GROUPS, EMPLOYEE_FIELDS, ALL_EDITABLE_FIELDS, type EmployeeFieldGroup } from '@arweqah-platform/shared';
import { ListChecks } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchesText } from '@/shared/lib/text-match';
import { Button, Dialog, SearchInput } from '@/shared/ui';

interface Props {
  /** The fields the grant gives its holder. */
  fields: readonly string[];
  onChange: (fields: string[]) => void;
  /** The grant cannot be edited here (a view of someone else's grant). */
  disabled?: boolean;
}

const box = 'size-5 accent-petrol-800';
const GROUPED = EMPLOYEE_FIELD_GROUPS.map((group) => ({ group, fields: EMPLOYEE_FIELDS.filter((f) => f.group === group).map((f) => f.key) }));

/** One group of fields: its name, how many are chosen, «select all / clear», and a box per field. */
function GroupSection({ group, keys, chosen, label, onToggle, onGroup }: { group: EmployeeFieldGroup; keys: string[]; chosen: ReadonlySet<string>; label: (key: string) => string; onToggle: (key: string) => void; onGroup: (keys: string[], on: boolean) => void }) {
  const { t } = useTranslation('roles');
  const count = keys.filter((k) => chosen.has(k)).length;
  const all = count === keys.length;
  return (
    <section aria-labelledby={`fields-${group}`} className="rounded-2xl border border-neutral-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`fields-${group}`} className="text-sm font-bold">{t(`fields.groups.${group}`)} <span className="font-normal text-muted">({count}/{keys.length})</span></h3>
        <Button type="button" size="sm" variant="ghost" onClick={() => onGroup(keys, !all)}>{all ? t('fields.clearGroup') : t('fields.selectGroup')}</Button>
      </div>
      {group === 'structure' && <p className="mb-3 text-xs text-muted">{t('fields.structureNote')}</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {keys.map((key) => (
          <li key={key}>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={box} checked={chosen.has(key)} onChange={() => onToggle(key)} />{label(key)}</label>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The window of «edit employees»: which details its holder may change. The choice is a draft of the page: it is saved with the role, group or person. */
function FieldsWindow({ fields, onChange, disabled, onClose }: Props & { onClose: () => void }) {
  const { t } = useTranslation('roles');
  const { t: te } = useTranslation('employees');
  const [search, setSearch] = useState('');
  const chosen = new Set(fields);
  const label = (key: string) => te(`fields.${key}`, { defaultValue: key });
  const set = (next: Iterable<string>) => onChange([...new Set(next)]);
  const toggle = (key: string) => set(chosen.has(key) ? fields.filter((f) => f !== key) : [...fields, key]);
  const group = (keys: string[], on: boolean) => set(on ? [...fields, ...keys] : fields.filter((f) => !keys.includes(f)));
  const shown = GROUPED.map((g) => ({ ...g, fields: g.fields.filter((k) => matchesText([label(k), k], search)) })).filter((g) => g.fields.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="rounded-2xl bg-petrol-50 px-4 py-3 text-sm">{t('fields.summary', { count: fields.length, total: EMPLOYEE_FIELDS.length })} {t('fields.unionNote')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput aria-label={t('fields.search')} placeholder={t('fields.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
        {!disabled && (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => set(DEFAULT_EDITABLE_FIELDS)}>{t('fields.basic')}</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => set(ALL_EDITABLE_FIELDS)}>{t('fields.all')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => set([])}>{t('fields.none')}</Button>
          </>
        )}
      </div>
      {shown.length === 0 && <p role="status" className="text-sm text-muted">{t('fields.noMatch')}</p>}
      <fieldset disabled={disabled} className="flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">{t('fields.title')}</legend>
        {shown.map((g) => <GroupSection key={g.group} group={g.group} keys={g.fields} chosen={chosen} label={label} onToggle={toggle} onGroup={group} />)}
      </fieldset>
      <div className="flex justify-end"><Button type="button" onClick={onClose}>{t('fields.done')}</Button></div>
    </div>
  );
}

/** The button beside the ticked «edit employees» row of the permission lists, with the window it opens (FR-94). */
export function FieldsButton(props: Props) {
  const { t } = useTranslation('roles');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
        <ListChecks className="size-4" aria-hidden />
        {t('fields.button', { count: props.fields.length })}
      </Button>
      {open && (
        <Dialog open xl onOpenChange={setOpen} title={t('fields.title')} description={t('fields.description')}>
          <FieldsWindow {...props} onClose={() => setOpen(false)} />
        </Dialog>
      )}
    </>
  );
}
