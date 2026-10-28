import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Textarea } from '@/shared/ui';
import { useMentionables } from './comments.api';
import { insertMention, mentionQueryAt, type Mentioned } from './mention-text';

interface Props {
  taskId: string;
  value: string;
  onChange: (text: string) => void;
  /** Everyone chosen from the list so far (their names are turned into mentions when the comment is sent). */
  onPick: (person: Mentioned) => void;
  label: string;
  /** Whether the person may mention at all: without it the box is a plain text area. */
  mayMention: boolean;
  rows?: number;
  maxLength: number;
  onSubmit?: () => void;
}

type KeyAction = 'submit' | 'next' | 'previous' | 'choose' | 'close';

const LIST_KEYS: Record<string, KeyAction> = { ArrowDown: 'next', ArrowUp: 'previous', Enter: 'choose', Tab: 'choose', Escape: 'close' };

/** What a key does: Ctrl+Enter sends; while the list is open the arrows, Enter, Tab and Escape drive it. */
function keyAction(event: KeyboardEvent, listOpen: boolean): KeyAction | null {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) return 'submit';
  return listOpen ? (LIST_KEYS[event.key] ?? null) : null;
}

/** A text area in which typing `@` opens the list of people to mention (arrow keys, Enter or a click choose; Escape closes). */
export function MentionTextarea({ taskId, value, onChange, onPick, label, mayMention, rows = 3, maxLength, onSubmit }: Props) {
  const { t } = useTranslation('tasks');
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const at = mayMention && !dismissed ? mentionQueryAt(value, caret) : null;
  const people = useMentionables(taskId, at?.query ?? '', at !== null).data ?? [];

  const choose = (person: Mentioned) => {
    const next = insertMention(value, caret, person);
    if (!next) return;
    onPick(person);
    onChange(next.text);
    setActive(0);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.caret, next.caret);
      setCaret(next.caret);
    });
  };
  const chooseActive = () => {
    const person = people[active];
    if (person) choose(person);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const action = keyAction(event, at !== null && people.length > 0);
    if (!action) return;
    if (action !== 'submit') event.preventDefault();
    if (action === 'submit') onSubmit?.();
    else if (action === 'close') setDismissed(true);
    else if (action === 'choose') chooseActive();
    else setActive((i) => (i + (action === 'next' ? 1 : people.length - 1)) % people.length);
  };
  return (
    <div className="relative">
      <Textarea
        ref={ref}
        rows={rows}
        maxLength={maxLength}
        aria-label={label}
        value={value}
        onChange={(e) => { setDismissed(false); setActive(0); setCaret(e.target.selectionStart); onChange(e.target.value); }}
        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
        onClick={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
      />
      {at && people.length > 0 && (
        <ul id={listId} role="listbox" aria-label={t('comments.mentionList')} className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
          {people.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active} className={cn('cursor-pointer rounded-lg px-3 py-2 text-sm', i === active ? 'bg-petrol-50 text-link' : 'hover:bg-neutral-50')} onMouseDown={(e) => { e.preventDefault(); choose(p); }}>
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
