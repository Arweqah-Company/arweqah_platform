import { useMemo } from 'react';
import { splitBody, type Mentioned } from './mention-text';

const CHIP = 'rounded-md bg-petrol-50 px-1.5 py-0.5 text-sm font-medium text-link';

/** The text of a comment: paragraphs as typed, and each mention as a chip with the person's name. */
export function CommentBody({ body, people }: { body: string; people: Mentioned[] }) {
  const parts = useMemo(() => splitBody(body, people), [body, people]);
  return (
    <p className="whitespace-pre-wrap break-words text-sm">
      {parts.map((part, i) => (part.kind === 'text' ? <span key={i}>{part.text}</span> : <span key={i} className={CHIP}>@{part.name}</span>))}
    </p>
  );
}
