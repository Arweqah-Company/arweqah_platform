/** Makes a user's text safe inside an ILIKE pattern: `%`, `_` and `\` match themselves. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** `%text%` for a contains-search, with the text taken literally. */
export const likeContains = (value: string): string => `%${escapeLike(value)}%`;
