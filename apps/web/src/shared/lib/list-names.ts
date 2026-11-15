/** Names joined the way the language writes a list («أ وب وج» / «A, B, and C»). */
export const listNames = (names: string[], language: string): string => new Intl.ListFormat(language, { type: 'conjunction' }).format(names);
