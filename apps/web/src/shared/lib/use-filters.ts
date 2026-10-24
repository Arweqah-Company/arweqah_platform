import { useState } from 'react';

/** Filter values by field id; an empty string means "not filtered". */
export type FilterValues = Record<string, string>;

/** The values of a list's filters (optionally starting with some, e.g. from a link); any change returns the list to its first page. */
export function useFilters(onChange: () => void, initial: FilterValues = {}) {
  const [values, setValues] = useState<FilterValues>(initial);
  const apply = (next: FilterValues) => {
    setValues(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '')));
    onChange();
  };
  return {
    values,
    set: (next: FilterValues) => apply(next),
    clear: () => apply({}),
    /** The value of one filter, or undefined, ready to send to the API. */
    get: (id: string): string | undefined => values[id] || undefined,
  };
}
