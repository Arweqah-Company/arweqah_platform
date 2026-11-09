/** A list of model names as a person wants to pick from: no repeats, in alphabetical order. */
export const sortedUnique = (names: readonly string[]): string[] => [...new Set(names)].sort((a, b) => a.localeCompare(b));

/** Google names a model `models/gemini-…`; the name to use is the part after the slash. */
export const withoutModelsPrefix = (name: string): string => name.replace(/^models\//, '');
