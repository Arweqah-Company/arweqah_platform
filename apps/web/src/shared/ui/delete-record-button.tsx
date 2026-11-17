import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '../lib/error-message';
import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';

interface DeleteRecordButtonProps {
  label: string;
  title: string;
  description: string;
  /** Shown as a toast once the record is deleted. */
  done: string;
  onDelete: () => Promise<unknown>;
  /** Runs after a successful delete (leave the record's page). */
  onDone: () => void;
}

/** A «Delete» button with its confirmation: for records that are hidden, never erased (a task, a ticket). The caller shows it only to who may. */
export function DeleteRecordButton({ label, title, description, done, onDelete, onDone }: DeleteRecordButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onDelete();
      toast.success(done);
      setOpen(false);
      onDone();
    } catch (error) {
      toast.error(errorMessage(t, error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}><Trash2 className="size-4" aria-hidden />{label}</Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={title} description={description} confirmLabel={label} tone="danger" busy={busy} onConfirm={confirm} />
    </>
  );
}
