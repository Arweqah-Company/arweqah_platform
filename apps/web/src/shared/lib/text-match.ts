/** Case-insensitive "contains" over several fields, for lists small enough to filter in the browser. */
export const matchesText = (fields: (string | null | undefined)[], term: string): boolean => {
  const needle = term.trim().toLowerCase();
  return !needle || fields.some((f) => f?.toLowerCase().includes(needle));
};
