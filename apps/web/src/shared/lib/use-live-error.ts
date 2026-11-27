import { useState } from 'react';

/**
 * The error of one field, shown as soon as it is useful: while the person types (the value differs from what the field
 * started with) or when they leave the field. A field nobody touched stays quiet, so a fresh form is not covered in errors.
 * Pass `submit` (the form's «save was pressed» flag) for a form that should speak only after the save attempt.
 */
export function useLiveError(value: unknown, validate: (value: never) => string | undefined, submit?: { attempted: boolean }): { error: string | undefined; onBlur: () => void } {
  const [initial] = useState(value);
  const [left, setLeft] = useState(false);
  // With `submit` the person is told only after pressing the save button (a field they merely passed through stays quiet); once told, it follows what they type.
  const touched = submit ? submit.attempted : left || value !== initial;
  return { error: touched ? validate(value as never) : undefined, onBlur: () => setLeft(true) };
}
