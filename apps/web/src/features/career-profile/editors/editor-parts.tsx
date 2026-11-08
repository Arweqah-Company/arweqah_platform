import type { CareerContent } from '@arweqah-platform/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Button, RowAction, Textarea } from '@/shared/ui';

/** A block of an editor: a heading, its rows, and the «add» button beneath them. */
export function EditorBlock({ title, hint, onAdd, addLabel, children }: { title: string; hint?: string; onAdd?: () => void; addLabel?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div>
        <h3 className="font-heading text-base font-bold text-fg">{title}</h3>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
      {onAdd && <div><Button variant="secondary" size="sm" onClick={onAdd}><Plus className="size-4" aria-hidden />{addLabel}</Button></div>}
    </section>
  );
}

/** One row of an editor: its fields side by side and a remove icon at the end. */
export function EditorRow({ children, onRemove, removeLabel }: { children: ReactNode; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <RowAction label={removeLabel} icon={Trash2} danger onClick={onRemove} />
    </div>
  );
}

/** One line per item, as in the title file: the text of a list is edited as lines (empty lines are dropped). */
export const toLines = (items: readonly string[]): string => items.join('\n');
export const fromLines = (text: string): string[] => text.split('\n').map((l) => l.trim()).filter(Boolean);

/**
 * A textarea that holds a list as lines. It keeps what the person typed (a trailing space, a new empty line) while the list it hands back is
 * clean, and shows the list again when it is changed from outside (another row, a reset).
 */
export function LinesTextarea({ lines, onLines, ...rest }: { lines: readonly string[]; onLines: (next: string[]) => void } & Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange'>) {
  const [text, setText] = useState(() => toLines(lines));
  if (toLines(fromLines(text)) !== toLines(lines)) setText(toLines(lines));
  return <Textarea {...rest} value={text} onChange={(e) => { setText(e.target.value); onLines(fromLines(e.target.value)); }} />;
}

/** Replaces one item of a list. */
export const replaceAt = <T,>(list: readonly T[], index: number, value: T): T[] => list.map((item, i) => (i === index ? value : item));
export const removeAt = <T,>(list: readonly T[], index: number): T[] => list.filter((_, i) => i !== index);

/** What every editor receives: the document being edited and how to hand back a changed copy. */
export interface EditorProps {
  content: CareerContent;
  onChange: (next: CareerContent) => void;
}

/** Sets one field of the document and hands the changed copy back. */
export const contentSetter =
  (content: CareerContent, onChange: EditorProps['onChange']) =>
  <K extends keyof CareerContent>(key: K, value: CareerContent[K]): void =>
    onChange({ ...content, [key]: value });
