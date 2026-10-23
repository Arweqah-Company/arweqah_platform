import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog } from '@/shared/ui';

interface Props {
  title: string;
  description: string;
  options: { id: string; label: string }[];
  initial: string[];
  /** Saves the chosen ids; rejects with the server's error, which is shown in the dialog. */
  save: (ids: string[]) => Promise<unknown>;
  savedText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** A list of checkboxes in a dialog (roles, or groups of roles) that replaces what the employee has. */
export function PickDialog({ title, description, options, initial, save, savedText, open, onOpenChange }: Props) {
  const { t: tc } = useTranslation();
  const [selected, setSelected] = useState(initial);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await save(selected);
      toast.success(savedText);
      onOpenChange(false);
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex flex-col gap-4">
        {!!error && <Alert>{errorMessage(tc, error)}</Alert>}
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{title}</legend>
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-petrol-800" checked={selected.includes(o.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter((id) => id !== o.id))} />
              {o.label}
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={busy} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
