import type { CreateOrgNodeInput, OrgTreeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { todayInRiyadh } from '@/shared/lib/lines';
import { toast } from 'sonner';
import { useCreateNode } from './api';
import { allowedLevels, effectiveModeOf, parentChoices, resolveMode, suggestCode, type ModeChoice } from './add-unit-rules';

/** The state, the derived choices and the saving of the «add unit» dialog; a unit may be added under the group or under any unit that can have children. */
export function useAddUnit(tree: OrgTreeDto, initialParentId: string | null, close: () => void) {
  const { t } = useTranslation('org');
  const choices = parentChoices(tree);
  const [parentId, setParentId] = useState<string | null>(choices.some((c) => c.node?.id === initialParentId) ? initialParentId : null);
  const [levelId, setLevelId] = useState('');
  const [names, setNames] = useState({ nameAr: '', nameEn: '' });
  const [prefix, setPrefix] = useState('');
  const [mode, setMode] = useState<ModeChoice>('');
  const [startDate, setStartDate] = useState(todayInRiyadh);
  const create = useCreateNode();
  const parent = tree.nodes.find((n) => n.id === parentId) ?? null;
  const allowed = allowedLevels(tree, parent);
  const level = allowed.find((l) => l.id === levelId) ?? allowed[0];
  const choice = resolveMode(parent === null, mode);
  const code = suggestCode(tree, parent, level, prefix);
  const valid = !!level && names.nameAr.trim().length >= 2 && !code.problem && choice !== '' && startDate !== '';

  const submit = async () => {
    if (!level || choice === '') return;
    const input: CreateOrgNodeInput = {
      levelId: level.id, parentId, nameAr: names.nameAr.trim(), nameEn: names.nameEn.trim() || names.nameAr.trim(), startDate, jobTitles: [],
      ...(parent === null ? { codePrefix: prefix } : {}),
      managementMode: choice === 'inherit' ? null : choice,
    };
    try {
      await create.mutateAsync(input);
      toast.success(t('add.saved'));
      close();
    } catch {
      /* the error is shown inside the dialog */
    }
  };

  return { choices, parentId, setParentId, parent, allowed, level, setLevelId, names, setNames, prefix, setPrefix, choice, setMode, startDate, setStartDate, code, effectiveMode: effectiveModeOf(parent, choice), valid, create, submit };
}

export type AddUnitState = ReturnType<typeof useAddUnit>;
