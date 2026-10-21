import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Dialog } from './dialog';
import { FormField, Input } from './form-field';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Destructive actions use the danger button. */
  tone?: 'primary' | 'danger';
  /** Irreversible bulk actions: the user must type this text (e.g. the number of records) to enable the button. */
  requireText?: { expected: string; label: string };
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = 'primary', requireText, busy, onConfirm, children }: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const blocked = !!requireText && typed.trim() !== requireText.expected;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setTyped(''); onOpenChange(next); }} title={title} description={description}>
      <div className="flex flex-col gap-4">
        {children}
        {requireText && (
          <FormField label={requireText.label}>
            {(p) => <Input {...p} dir="ltr" inputMode="numeric" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />}
          </FormField>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} disabled={blocked || busy} onClick={() => void onConfirm()}>
            {confirmLabel ?? t('actions.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
