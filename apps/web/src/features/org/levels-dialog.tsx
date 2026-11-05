import type { OrgLevelsDto } from '@arweqah-platform/shared';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, DialogFooter } from '@/shared/ui';
import { useOrgLevels, useSaveLevelRules, useSaveLevels } from './api';
import { addType, draftFrom, isDraftValid, patchType, removeType, rulesForSave, setPair, toggleRow, toTypeInputs, type LevelsDraft } from './levels-draft';
import { LevelsMatrix } from './levels-matrix';
import { LevelsTypesTable } from './levels-types-table';

/** The draft of the window and what it saves: the types first, then the table (it needs the keys the server gives to added types). */
function useLevelsEditor(initial: OrgLevelsDto, onDone: () => void) {
  const { t } = useTranslation('org');
  const [draft, setDraft] = useState<LevelsDraft>(() => draftFrom(initial));
  const serial = useRef(0);
  const saveTypes = useSaveLevels();
  const saveRules = useSaveLevelRules();
  const change = (next: (d: LevelsDraft) => LevelsDraft) => setDraft((d) => next(d));
  const save = async () => {
    try {
      const saved = await saveTypes.mutateAsync({ levels: toTypeInputs(draft) });
      await saveRules.mutateAsync({ rules: rulesForSave(draft, saved.levels) });
      toast.success(t('levels.saved'));
      onDone();
    } catch {
      /* shown inside the window */
    }
  };
  return {
    draft, valid: isDraftValid(draft), pending: saveTypes.isPending || saveRules.isPending, error: saveTypes.error ?? saveRules.error, save,
    patch: (key: string, p: Parameters<typeof patchType>[2]) => change((d) => patchType(d, key, p)),
    add: () => change((d) => addType(d, ++serial.current)),
    remove: (key: string) => change((d) => removeType(d, key)),
    toggle: (parent: string, child: string, on: boolean) => change((d) => setPair(d, parent, child, on)),
    toggleRow: (parent: string) => change((d) => toggleRow(d, parent)),
  };
}

function LevelsEditor({ initial, onClose }: { initial: OrgLevelsDto; onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const e = useLevelsEditor(initial, onClose);
  return (
    <div className="flex flex-col gap-6">
      {e.error && <Alert>{errorMessage(tc, e.error)}</Alert>}
      <LevelsTypesTable draft={e.draft} onPatch={e.patch} onAdd={e.add} onRemove={e.remove} />
      <LevelsMatrix draft={e.draft} onToggle={e.toggle} onToggleRow={e.toggleRow} />
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
        <Button disabled={!e.valid || e.pending} onClick={() => void e.save()}>{t('levels.save')}</Button>
      </DialogFooter>
    </div>
  );
}

/** «Organization divisions»: the unit types of the group and the table of who may be created under whom, saved together. */
export function LevelsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const levels = useOrgLevels();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} xl title={t('levels.title')} description={t('levels.description')}>
      {levels.isError && <Alert>{errorMessage(tc, levels.error)}</Alert>}
      {levels.data ? <LevelsEditor initial={levels.data} onClose={onClose} /> : !levels.isError && <div role="status" className="h-24 animate-pulse rounded-2xl bg-neutral-50" />}
    </Dialog>
  );
}
