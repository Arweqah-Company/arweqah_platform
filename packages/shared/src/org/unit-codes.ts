import { OFFICE_CODE_NUMBER, TITLE_GRADE_MAX, TITLE_GRADE_MIN, TITLE_TRACKS, UNIT_TYPE, type TitleTrack } from './unit-types';

/** A unit code has four slots, one per type: sector (letters), department, section, unit. A zero means «no level of this type here». */
const SLOT_COUNT = 4;
const DEPARTMENT_SLOT = 1;
const SECTION_SLOT = 2;
const UNIT_SLOT = 3;
const ZERO = '00';
const PREFIX = /^[A-Z]{3}$/;

export function isValidCodePrefix(prefix: string): boolean {
  return PREFIX.test(prefix);
}

/** A code of a sector, or of a department/office placed directly under the group root: `OPS.00.00.00`. */
export function rootLevelCode(prefix: string): string | null {
  return isValidCodePrefix(prefix) ? [prefix, ZERO, ZERO, ZERO].join('.') : null;
}

const OFFICE_SLOT_UNDER: Readonly<Record<string, number>> = {
  [UNIT_TYPE.Sector]: DEPARTMENT_SLOT,
  [UNIT_TYPE.Department]: SECTION_SLOT,
  [UNIT_TYPE.Section]: UNIT_SLOT,
};
const SLOT_OF_TYPE: Readonly<Record<string, number>> = {
  [UNIT_TYPE.Department]: DEPARTMENT_SLOT,
  [UNIT_TYPE.Section]: SECTION_SLOT,
  [UNIT_TYPE.Unit]: UNIT_SLOT,
};

/** The slot a child takes: by its own type; an office takes the slot where it sits; an added type takes the unit slot. */
export function slotFor(parentType: string, childType: string): number | null {
  if (childType === UNIT_TYPE.Office) return OFFICE_SLOT_UNDER[parentType] ?? null;
  return SLOT_OF_TYPE[childType] ?? UNIT_SLOT;
}

export interface NextCodeInput {
  parentCode: string;
  parentType: string;
  childType: string;
  /** Codes of the parent's existing children. */
  siblingCodes: readonly string[];
}

function usedNumbers(siblingCodes: readonly string[], slot: number): Set<number> {
  const used = new Set<number>();
  for (const code of siblingCodes) {
    const part = code.split('.')[slot];
    if (part && part !== ZERO) used.add(Number(part));
  }
  return used;
}

function nextOrdinary(used: Set<number>): number {
  let next = Math.max(0, ...[...used].filter((n) => n !== OFFICE_CODE_NUMBER)) + 1;
  if (next === OFFICE_CODE_NUMBER) next += 1;
  return next;
}

function nextOffice(used: Set<number>): number | null {
  for (let n = OFFICE_CODE_NUMBER; n >= 1; n -= 1) if (!used.has(n)) return n;
  return null;
}

/**
 * The code of a new child unit. Null when the slot of its type is not free under this parent (taken by the parent or an
 * ancestor, or by a level below it), or when an office finds no number left.
 */
export function nextUnitCode(input: NextCodeInput): string | null {
  const parts = input.parentCode.split('.');
  const slot = slotFor(input.parentType, input.childType);
  if (parts.length !== SLOT_COUNT || slot === null || parts[slot] !== ZERO || parts.slice(slot + 1).some((p) => p !== ZERO)) return null;
  const used = usedNumbers(input.siblingCodes, slot);
  const number = input.childType === UNIT_TYPE.Office ? nextOffice(used) : nextOrdinary(used);
  if (number === null) return null;
  parts[slot] = String(number).padStart(2, '0');
  return parts.join('.');
}

export interface ParsedTitleCode {
  unitCode: string;
  grade: number;
  track: TitleTrack;
  sequence: number;
}

const TITLE_CODE = /^([A-Z]{3}\.\d{2}\.\d{2}\.\d{2})-L(\d)([A-Z])-(\d{2})$/;

/** `OPS.03.03.01-L7P-01` → unit code, grade 7, track P, sequence 1; null when the text is not a title code. */
export function parseTitleCode(code: string): ParsedTitleCode | null {
  const match = TITLE_CODE.exec(code);
  if (!match) return null;
  const grade = Number(match[2]);
  const track = match[3] as TitleTrack;
  if (grade < TITLE_GRADE_MIN || grade > TITLE_GRADE_MAX || !TITLE_TRACKS.includes(track)) return null;
  return { unitCode: match[1] as string, grade, track, sequence: Number(match[4]) };
}

export function buildTitleCode(unitCode: string, grade: number, track: TitleTrack, sequence: number): string {
  return `${unitCode}-L${grade}${track}-${String(sequence).padStart(2, '0')}`;
}
