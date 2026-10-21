import type { JobTitleInput, OrgNodeDto, OrgTreeDto } from '@arweqah-platform/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useManagerSearch } from '@/features/employees';
import type { ComboboxOption } from '@/shared/ui';
import { useCreateNode, useUpdateNode } from './api';
import { titleRowsValid } from './job-title-rows';

interface Options {
  tree: OrgTreeDto;
  editing?: OrgNodeDto;
  initialParentId?: string | null;
  close: () => void;
}

/** The first level to offer: the one below the chosen parent, or the top one. */
function startingLevelId(tree: OrgTreeDto, parentId: string | null | undefined): string {
  const parent = parentId ? tree.nodes.find((n) => n.id === parentId) : undefined;
  const index = parent ? tree.levels.findIndex((l) => l.id === parent.levelId) + 1 : 0;
  return tree.levels[index]?.id ?? '';
}

/** The picker shows the current manager's name before any search has run. */
function withCurrentManager(found: ComboboxOption[], editing: OrgNodeDto | undefined): ComboboxOption[] {
  const id = editing?.managerId;
  if (!id || !editing.managerName || found.some((m) => m.value === id)) return found;
  return [{ value: id, label: editing.managerName }, ...found];
}

/** What each input starts with: the unit being edited, or a new unit under the chosen parent. */
function initialValues({ tree, editing, initialParentId }: Omit<Options, 'close'>) {
  if (editing) {
    return { levelId: editing.levelId, parentId: editing.parentId, names: { nameAr: editing.nameAr, nameEn: editing.nameEn }, managerId: editing.managerId, isActive: editing.isActive };
  }
  return { levelId: startingLevelId(tree, initialParentId), parentId: initialParentId ?? null, names: { nameAr: '', nameEn: '' }, managerId: null, isActive: true };
}

/** Every input of the form. Changing the level forgets the parent, which belonged to the old level. */
function useNodeFields(options: Omit<Options, 'close'>) {
  const initial = useMemo(() => initialValues(options), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [levelId, setLevel] = useState(initial.levelId);
  const [parentId, setParentId] = useState<string | null>(initial.parentId);
  const [names, setNames] = useState(initial.names);
  const [managerId, setManagerId] = useState<string | null>(initial.managerId);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [titles, setTitles] = useState<JobTitleInput[]>([{ nameAr: '', nameEn: '' }]);
  const setLevelId = (id: string) => {
    setLevel(id);
    setParentId(null);
  };
  return { levelId, setLevelId, parentId, setParentId, names, setNames, managerId, setManagerId, isActive, setIsActive, titles, setTitles };
}

type Fields = ReturnType<typeof useNodeFields>;

/** The form can be saved when names, placement and (for units that take employees) job titles are complete. */
function isComplete(f: Fields, where: { hasLevel: boolean; levelIndex: number; editing: boolean; needsTitles: boolean }): boolean {
  const namesOk = f.names.nameAr.trim().length >= 2 && f.names.nameEn.trim().length >= 2;
  const placementOk = where.hasLevel && (where.editing || where.levelIndex === 0 || !!f.parentId);
  const titlesOk = !where.needsTitles || (f.titles.length > 0 && titleRowsValid(f.titles));
  return namesOk && placementOk && titlesOk;
}

/** Picker options and whether the form can be saved. */
function useNodeChoices(tree: OrgTreeDto, fields: Fields, editing: OrgNodeDto | undefined) {
  const { i18n } = useTranslation('org');
  const [search, setSearch] = useState('');
  const managers = useManagerSearch(search);
  const levelIndex = tree.levels.findIndex((l) => l.id === fields.levelId);
  const level = tree.levels[levelIndex];
  const parentLevel = tree.levels[levelIndex - 1];
  const ar = i18n.language === 'ar';
  const parentOptions = useMemo(() => tree.nodes.filter((n) => n.levelId === parentLevel?.id && n.isActive).map((n) => ({ value: n.id, label: ar ? n.pathAr : n.pathEn })), [tree.nodes, parentLevel, ar]);
  const found = (managers.data ?? []).map((m) => ({ value: m.id, label: m.fullName, hint: m.employeeNumber }));
  const needsTitles = !editing && !!level?.isAssignable;
  const valid = isComplete(fields, { hasLevel: !!level, levelIndex, editing: !!editing, needsTitles });
  return { levelIndex, parentLevel, parentOptions, managerOptions: withCurrentManager(found, editing), setSearch, needsTitles, valid };
}

/** State, derived options and saving of the "add / edit unit" form. */
export function useNodeForm({ tree, editing, initialParentId, close }: Options) {
  const { t } = useTranslation('org');
  const fields = useNodeFields({ tree, editing, initialParentId });
  const choices = useNodeChoices(tree, fields, editing);
  const create = useCreateNode();
  const update = useUpdateNode(editing?.id ?? '');

  const submit = async () => {
    const base = { nameAr: fields.names.nameAr.trim(), nameEn: fields.names.nameEn.trim(), managerId: fields.managerId };
    try {
      if (editing) await update.mutateAsync({ ...base, isActive: fields.isActive });
      else await create.mutateAsync({ ...base, levelId: fields.levelId, parentId: choices.levelIndex === 0 ? null : fields.parentId, jobTitles: choices.needsTitles ? fields.titles : [] });
      toast.success(t('node.saved'));
      close();
    } catch {
      /* the error is shown inside the dialog */
    }
  };

  return { ...fields, ...choices, mutation: editing ? update : create, submit };
}

export type NodeFormState = ReturnType<typeof useNodeForm>;
