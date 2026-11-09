/** Replaces one item of a list, handing back a changed copy. */
export const replaceAt = <T,>(list: readonly T[], index: number, value: T): T[] => list.map((item, i) => (i === index ? value : item));

/** Removes one item of a list, handing back a changed copy. */
export const removeAt = <T,>(list: readonly T[], index: number): T[] => list.filter((_, i) => i !== index);
