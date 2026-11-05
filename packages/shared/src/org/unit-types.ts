/**
 * Unit types of the group-wide organization structure (docs/plans/phase-5-people-structure-profile.md, section 17).
 * The five built-in types are the same for every company; an administrator may add more from «Organization levels».
 */
export const UNIT_TYPE = {
  Sector: 'sector',
  Department: 'department',
  Section: 'section',
  Unit: 'unit',
  Office: 'office',
} as const;

export type BuiltInUnitType = (typeof UNIT_TYPE)[keyof typeof UNIT_TYPE];

export const BUILT_IN_UNIT_TYPES: readonly BuiltInUnitType[] = [UNIT_TYPE.Sector, UNIT_TYPE.Department, UNIT_TYPE.Section, UNIT_TYPE.Unit, UNIT_TYPE.Office];

/** The key of the group root («Arweqah Alreyadah») in the parent–child table. */
export const ROOT_PARENT = 'root';

/** Who may sit under whom, as stored (the administrator edits it). Two rules are fixed in code: a sector only under the root, no office under an office. */
export const DEFAULT_PARENT_RULES: Readonly<Record<string, readonly string[]>> = {
  [ROOT_PARENT]: [UNIT_TYPE.Sector, UNIT_TYPE.Department, UNIT_TYPE.Office],
  [UNIT_TYPE.Sector]: [UNIT_TYPE.Department, UNIT_TYPE.Section, UNIT_TYPE.Unit, UNIT_TYPE.Office],
  [UNIT_TYPE.Department]: [UNIT_TYPE.Section, UNIT_TYPE.Unit, UNIT_TYPE.Office],
  [UNIT_TYPE.Section]: [UNIT_TYPE.Unit, UNIT_TYPE.Office],
  [UNIT_TYPE.Office]: [UNIT_TYPE.Section, UNIT_TYPE.Unit],
  [UNIT_TYPE.Unit]: [],
};

/** Whether a unit of this type accepts job titles and employees (a sector never does). */
export const DEFAULT_ACCEPTS_TITLES: Readonly<Record<BuiltInUnitType, boolean>> = {
  [UNIT_TYPE.Sector]: false,
  [UNIT_TYPE.Department]: true,
  [UNIT_TYPE.Section]: true,
  [UNIT_TYPE.Unit]: true,
  [UNIT_TYPE.Office]: true,
};

/** The number an office takes in the slot where it sits (OPS.09.00.00). */
export const OFFICE_CODE_NUMBER = 9;

export const MANAGEMENT_MODES = ['shared', 'per_company'] as const;
export type ManagementMode = (typeof MANAGEMENT_MODES)[number];

/** Job-title tracks: M management, P professional, J projects, C consulting, S support. */
export const TITLE_TRACKS = ['M', 'P', 'J', 'C', 'S'] as const;
export type TitleTrack = (typeof TITLE_TRACKS)[number];
export const TITLE_GRADE_MIN = 1;
export const TITLE_GRADE_MAX = 9;
