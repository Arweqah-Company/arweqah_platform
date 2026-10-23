import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { FormEvent, ReactNode } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog } from '@/shared/ui';
import { GroupNamesFields, groupNamesOk, type GroupNames } from './group-names-fields';

interface Props {
  title: string;
  names: GroupNames;
  onNames: (names: GroupNames) => void;
  /** Saves the group and answers its id; a failure is shown in the dialog. */
  save: () => Promise<{ id: string }>;
  savedText: string;
  error: unknown;
  busy: boolean;
  onClose: (savedId?: string) => void;
  /** What the group holds besides its names: the roles inside it, or its members. */
  children: ReactNode;
}

/** The frame of the form of a group (names, what it holds, cancel and save), the same for groups of roles and of people. */
export function GroupDialogShell({ title, names, onNames, save, savedText, error, busy, onClose, children }: Props) {
  const { t: tc } = useTranslation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const saved = await save();
      toast.success(savedText);
      onClose(saved.id);
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={title}>
      <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)} noValidate>
        {!!error && <Alert>{errorMessage(tc, error)}</Alert>}
        <GroupNamesFields value={names} onChange={onNames} />
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onClose()}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={busy || !groupNamesOk(names)}>{tc('actions.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
