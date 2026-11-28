import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { useDialogTools } from './dialog-tools';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** A form with several fields side by side gets more room. */
  wide?: boolean;
  /** A table of several columns gets the most room (56rem). */
  xl?: boolean;
}

export function Dialog({ open, onOpenChange, title, description, children, wide, xl }: DialogProps) {
  const { t } = useTranslation();
  const tools = useDialogTools();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px]" />
        {/* Fades without moving: a `transform` would make this box the reference of the corner tools below while it animates. The height leaves room under it for the corner tools. */}
        <RadixDialog.Content className={cn('fixed inset-x-4 top-[8vh] z-50 mx-auto max-h-[calc(92dvh-5rem)] overflow-y-auto animate-fade rounded-3xl bg-white p-7 shadow-2xl shadow-ink/20', xl ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-lg')}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="font-heading text-lg font-bold">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="mt-1 text-sm text-muted">{description}</RadixDialog.Description>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <RadixDialog.Close className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-neutral-200 text-fg transition-colors hover:bg-neutral-50" aria-label={t('actions.close')}>
                <X className="size-4" />
              </RadixDialog.Close>
            </div>
          </div>
          {children}
          {/* Inside the content, so it is reachable by keyboard and screen reader and a click on it never closes the window; the box takes no clicks itself, only the tools in it. */}
          {tools && <div className="pointer-events-none fixed bottom-4 end-4 z-50 flex items-center gap-2" data-testid="dialog-corner-tools">{tools}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** The buttons at the bottom of a long form: they stay in view while the form scrolls, so saving is never out of reach. */
export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="sticky -bottom-7 -mx-7 -mb-7 mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-200 bg-white px-7 py-4">{children}</div>;
}
