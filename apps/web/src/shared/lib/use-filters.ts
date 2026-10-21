import { useState } from 'react';

/** Filter values by field id; an empty string means "not filtered". */
export type FilterValues = Record<string, string>;

/** The values of a list's filters; any change returns the list to its first page. */
export function useFilters(onChange: () => void) {
  const [values, setValues] = useState<FilterValues>({});
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
