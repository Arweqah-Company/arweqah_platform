import { LIST_CATALOG, type ListKey, type ListSettingDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { saveWithToast } from '@/shared/lib/use-save-toast';
import { Alert, Button, SectionCard } from '@/shared/ui';
import { useSaveListSetting } from './api';

const NONE: ListSettingDto = { hiddenColumns: [], hiddenFilters: [] };

interface ChoicesProps {
  id: string;
  title: string;
  hint: string;
  names: readonly string[];
  label: (id: string) => string;
  hidden: string[];
  /** The first column is the name of the row and always stays. */
  locked?: string;
  onToggle: (id: string) => void;
}

function Choices({ id, title, hint, names, label, hidden, locked, onToggle }: ChoicesProps) {
  return (
    <SectionCard id={id} title={title} description={hint}>
      <ul className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
        {names.map((name) => (
          <li key={name}>
            <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-neutral-200 px-4 text-sm">
              <input type="checkbox" className="size-4 accent-petrol-800" checked={!hidden.includes(name)} disabled={name === locked} onChange={() => onToggle(name)} />
              {label(name)}
            </label>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const differs = (a: ListSettingDto, b: ListSettingDto) => !sameItems(a.hiddenColumns, b.hiddenColumns) || !sameItems(a.hiddenFilters, b.hiddenFilters);

/** One list: tick the columns and filters it shows; saving replaces what is hidden. */
export function ListSettingForm({ listKey, current }: { listKey: ListKey; current: ListSettingDto | undefined }) {
  const { t } = useTranslation('listSettings');
  const { t: tc } = useTranslation();
  const save = useSaveListSetting(listKey);
  const [form, setForm] = useState<ListSettingDto>(current ?? NONE);
  const catalog = LIST_CATALOG[listKey];
  const toggle = (field: keyof ListSettingDto) => (id: string) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(id) ? f[field].filter((x) => x !== id) : [...f[field], id] }));
  const changed = differs(form, current ?? NONE);
  const submit = saveWithToast(save.mutateAsync, t('saved'));
  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); void submit(form); }} noValidate>
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      {catalog.columns.length > 0 && (
        <Choices id="columns" title={t('columnsTitle')} hint={t('columnsHint')} names={catalog.columns} label={(id) => t(`list.${listKey}.columns.${id}`)} hidden={form.hiddenColumns} locked={catalog.columns[0]} onToggle={toggle('hiddenColumns')} />
      )}
      {catalog.filters.length > 0 && (
        <Choices id="filters" title={t('filtersTitle')} hint={t('filtersHint')} names={catalog.filters} label={(id) => t(`list.${listKey}.filters.${id}`)} hidden={form.hiddenFilters} onToggle={toggle('hiddenFilters')} />
      )}
      <div><Button type="submit" disabled={save.isPending || !changed}>{tc('actions.save')}</Button></div>
    </form>
  );
}
