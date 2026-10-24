import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** A form with several fields side by side gets more room. */
  wide?: boolean;
}

export function Dialog({ open, onOpenChange, title, description, children, wide }: DialogProps) {
  const { t } = useTranslation();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px]" />
        <RadixDialog.Content className={cn('fixed inset-x-4 top-[8vh] z-50 mx-auto max-h-[84vh] overflow-y-auto animate-fade-in rounded-3xl bg-white p-7 shadow-2xl shadow-ink/20', wide ? 'max-w-2xl' : 'max-w-lg')}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="font-heading text-lg font-bold">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="mt-1 text-sm text-muted">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-neutral-200 text-fg transition-colors hover:bg-neutral-50" aria-label={t('actions.close')}>
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
