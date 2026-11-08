export const CODE_PART_KEYS = ['sector', 'department', 'section', 'unit'] as const;
export type CodePartKey = (typeof CODE_PART_KEYS)[number];

export interface TitleCodeParts {
  /** The unit's four slots (a slot the unit does not use is `00`). */
  slots: { key: CodePartKey; value: string }[];
  /** «L9P»: the grade and the track. */
  gradeTrack: string;
  sequence: string;
}

/** `OPS.01.01.01-L9P-01` → its unit slots, grade and track, and sequence; null for a code that does not have that shape. */
export function splitTitleCode(code: string | null): TitleCodeParts | null {
  const match = /^([A-Z0-9]{2,4})\.(\d{2})\.(\d{2})\.(\d{2})-(L[1-9][MPJCS])-(\d{2,})$/.exec(code ?? '');
  if (!match) return null;
  const [, sector, department, section, unit, gradeTrack, sequence] = match as unknown as string[];
  return { slots: [{ key: 'sector', value: sector as string }, { key: 'department', value: department as string }, { key: 'section', value: section as string }, { key: 'unit', value: unit as string }], gradeTrack: gradeTrack as string, sequence: sequence as string };
}
