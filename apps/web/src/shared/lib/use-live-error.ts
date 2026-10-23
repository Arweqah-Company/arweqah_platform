import { useState } from 'react';

/**
 * The error of one field, shown as soon as it is useful: while the person types (the value differs from what the field
 * started with) or when they leave the field. A field nobody touched stays quiet, so a fresh form is not covered in errors.
 */
export function useLiveError(value: unknown, validate: (value: never) => string | undefined): { error: string | undefined; onBlur: () => void } {
  const [initial] = useState(value);
  const [left, setLeft] = useState(false);
  const touched = left || value !== initial;
  return { error: touched ? validate(value as never) : undefined, onBlur: () => setLeft(true) };
}
