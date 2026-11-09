import type { CareerContent } from '@arweqah-platform/shared';
import { useState, type ComponentProps } from 'react';
import { removeAt, replaceAt } from '@/shared/lib/array-edit';
import { Textarea } from '@/shared/ui';

export { EditorBlock, EditorRow } from '@/shared/ui';
export { removeAt, replaceAt };

/** One line per item, as in the title file: the text of a list is edited as lines (empty lines are dropped). */
export const toLines = (items: readonly string[]): string => items.join('\n');
export const fromLines = (text: string): string[] => text.split('\n').map((l) => l.trim()).filter(Boolean);

/**
 * A textarea that holds a list as lines. It keeps what the person typed (a trailing space, a new empty line) while the list it hands back is
 * clean, and shows the list again when it is changed from outside (another row, a reset).
 */
export function LinesTextarea({ lines, onLines, ...rest }: { lines: readonly string[]; onLines: (next: string[]) => void } & Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange'>) {
  const [text, setText] = useState(() => toLines(lines));
  if (toLines(fromLines(text)) !== toLines(fromLines(toLines(lines)))) setText(toLines(lines));
  return <Textarea {...rest} value={text} onChange={(e) => { setText(e.target.value); onLines(fromLines(e.target.value)); }} />;
}

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
