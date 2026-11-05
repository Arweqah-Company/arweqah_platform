import { BusinessRuleError, ConflictError, ForbiddenError } from '../../../../common/domain/domain-error';

export class InvalidOrgHierarchyError extends BusinessRuleError {
  override readonly code = 'INVALID_ORG_HIERARCHY';
}

export class InvalidPlacementError extends BusinessRuleError {
  override readonly code = 'INVALID_PLACEMENT';
}

export class CompanyCodeTakenError extends ConflictError {
  override readonly code = 'COMPANY_CODE_TAKEN';
  constructor() {
    super('Company code is already used');
  }
}

export class CompanyInUseError extends BusinessRuleError {
  override readonly code = 'COMPANY_IN_USE';
  constructor() {
    super('Move or remove the company\'s employees and units first');
  }
}

export class OrgNodeHasTicketsError extends BusinessRuleError {
  override readonly code = 'ORG_NODE_HAS_TICKETS';
  constructor() {
    super('A department with a ticket desk that receives tickets, or with open tickets, cannot be moved or deleted');
  }
}

export class OrgNodeInUseError extends BusinessRuleError {
  override readonly code = 'ORG_NODE_IN_USE';
  constructor() {
    super('Move or remove its sub-units and employees first');
  }
}

export class LastJobTitleError extends BusinessRuleError {
  override readonly code = 'LAST_JOB_TITLE';
  constructor() {
    super('A unit that accepts employees needs at least one job title');
  }
}

export class JobTitleInUseError extends BusinessRuleError {
  override readonly code = 'JOB_TITLE_IN_USE';
  constructor() {
    super('Move the employees with this job title first');
  }
}

/** The unit type table (names, accepts titles, added or removed types) breaks a rule. */
export class InvalidOrgLevelsError extends BusinessRuleError {
  override readonly code = 'INVALID_ORG_LEVELS';
}

/** The «who may be created under whom» table refers to an unknown type or breaks a fixed rule. */
export class InvalidOrgRulesError extends BusinessRuleError {
  override readonly code = 'INVALID_ORG_RULES';
}

export class OrgLevelInUseError extends BusinessRuleError {
  override readonly code = 'ORG_LEVEL_IN_USE';
  constructor() {
    super('Units of this type exist; move or delete them before removing the type');
  }
}

/** A sector, or a unit directly under the group, starts its code with three letters the creator must give. */
export class OrgCodePrefixRequiredError extends BusinessRuleError {
  override readonly code = 'ORG_CODE_PREFIX_REQUIRED';
  constructor() {
    super('Give a three-letter code prefix for a sector or a unit placed directly under the group');
  }
}

export class OrgCodeSlotUnavailableError extends BusinessRuleError {
  override readonly code = 'ORG_CODE_SLOT_UNAVAILABLE';
  constructor() {
    super('No unit code slot is free for this type under this parent');
  }
}

export class OrgCodeTakenError extends ConflictError {
  override readonly code = 'ORG_CODE_TAKEN';
  constructor() {
    super('This unit code is already used');
  }
}

export class OrgCodeAlreadySetError extends ConflictError {
  override readonly code = 'ORG_CODE_ALREADY_SET';
  constructor() {
    super('This unit already has a code');
  }
}

/** A sector and a unit directly under the group must say how they are managed; elsewhere «inherit» is allowed. */
export class OrgModeRequiredError extends BusinessRuleError {
  override readonly code = 'ORG_MODE_REQUIRED';
  constructor() {
    super('Choose how this unit is managed: shared or per company');
  }
}

/** The whole structure, or a comparison with another company, needs the «see the whole structure» key. */
export class OrgViewFullRequiredError extends ForbiddenError {
  override readonly code = 'ORG_VIEW_FULL_REQUIRED';
  constructor() {
    super('Seeing the whole structure needs the «see the whole structure» permission');
  }
}

export class GroupCompanyMissingError extends BusinessRuleError {
  override readonly code = 'GROUP_COMPANY_MISSING';
  constructor() {
    super('The group company has not been created yet');
  }
}

// ---------------------------------------------------------------- dated versions (FR-99)
const bilingual = (ar: string, en: string, path?: string) => ({ ...(path ? { path } : {}), messageAr: ar, messageEn: en });

/** A dated change starts today or later; the past is never rewritten. */
export class OrgVersionInThePastError extends BusinessRuleError {
  override readonly code = 'ORG_VERSION_IN_THE_PAST';
  constructor() {
    super('The change cannot start in the past', bilingual('لا يبدأ التغيير في الماضي', 'The change cannot start in the past', 'effectiveFrom'));
  }
}

export class OrgVersionDateNotAfterError extends BusinessRuleError {
  override readonly code = 'ORG_VERSION_DATE_NOT_AFTER';
  constructor(lastFrom: string) {
    super(`The change must start after ${lastFrom}`, bilingual(`يجب أن يبدأ التغيير بعد ${lastFrom}`, `The change must start after ${lastFrom}`, 'effectiveFrom'));
  }
}

// -------------------------------------------------------------------- leaders (FR-100)
export class OrgLeaderCompanyError extends BusinessRuleError {
  override readonly code = 'ORG_LEADER_COMPANY';
  constructor() {
    super('A shared unit is led from the group company; a unit managed per company is led for each company by one of its own people', bilingual('الوحدة المشتركة تُقاد من شركة المجموعة، والوحدة التي تُدار لكل شركة يقودها لكل شركة أحد موظفيها', 'A shared unit is led from the group company; a unit managed per company is led for each company by one of its own people', 'companyId'));
  }
}

export class OrgLeaderEmployeeError extends BusinessRuleError {
  override readonly code = 'ORG_LEADER_EMPLOYEE';
  constructor() {
    super('The leader must be an active employee of the company', bilingual('يجب أن يكون القائد موظفًا فعّالًا في الشركة', 'The leader must be an active employee of the company', 'employeeId'));
  }
}

export class OrgLeaderInThePastError extends BusinessRuleError {
  override readonly code = 'ORG_LEADER_IN_THE_PAST';
  constructor() {
    super('A leader starts today or later', bilingual('يبدأ القائد اليوم أو لاحقًا', 'A leader starts today or later', 'validFrom'));
  }
}

export class OrgLeaderDateNotAfterError extends BusinessRuleError {
  override readonly code = 'ORG_LEADER_DATE_NOT_AFTER';
  constructor(lastFrom: string) {
    super(`The new leader must start after ${lastFrom}`, bilingual(`يجب أن يبدأ القائد الجديد بعد ${lastFrom}`, `The new leader must start after ${lastFrom}`, 'validFrom'));
  }
}

/** An acting leader stands in for a leader and covers a window, so it needs both: a leader to stand in for, and the two ends. */
export class OrgActingNeedsLeaderError extends BusinessRuleError {
  override readonly code = 'ORG_ACTING_NEEDS_LEADER';
  constructor() {
    super('An acting leader needs a leader in force for the whole window', bilingual('القائم بالأعمال يحتاج قائدًا قائمًا طوال المدة', 'An acting leader needs a leader in force for the whole window', 'kind'));
  }
}

export class OrgActingWindowError extends BusinessRuleError {
  override readonly code = 'ORG_ACTING_WINDOW';
  constructor() {
    super('An acting leader needs an end date', bilingual('القائم بالأعمال يحتاج تاريخ نهاية', 'An acting leader needs an end date', 'validTo'));
  }
}

export class OrgActingIsLeaderError extends BusinessRuleError {
  override readonly code = 'ORG_ACTING_IS_LEADER';
  constructor() {
    super('The acting leader cannot be the leader', bilingual('لا يكون القائم بالأعمال هو القائد نفسه', 'The acting leader cannot be the leader', 'employeeId'));
  }
}

export class OrgActingOverlapError extends BusinessRuleError {
  override readonly code = 'ORG_ACTING_OVERLAP';
  constructor() {
    super('Another acting leader already covers part of this window', bilingual('قائم بالأعمال آخر يغطي جزءًا من هذه المدة', 'Another acting leader already covers part of this window', 'validFrom'));
  }
}

export class OrgLeaderNotPendingError extends BusinessRuleError {
  override readonly code = 'ORG_LEADER_NOT_PENDING';
  constructor() {
    super('Only a leader that has not started yet can be removed; end one in force instead', bilingual('لا يُحذف إلا قائد لم يبدأ بعد؛ أنهِ القائد القائم بدلًا من ذلك', 'Only a leader that has not started yet can be removed; end one in force instead'));
  }
}

export class OrgLeaderEndError extends BusinessRuleError {
  override readonly code = 'ORG_LEADER_END';
  constructor() {
    super('The end date is today or later and not before the start', bilingual('تاريخ النهاية اليوم أو لاحقًا ولا يسبق البداية', 'The end date is today or later and not before the start', 'endDate'));
  }
}

// ------------------------------------------------------------------ job titles (FR-104…107)
export class JobTitleCycleError extends BusinessRuleError {
  override readonly code = 'JOB_TITLE_CYCLE';
  constructor() {
    super('A job title cannot report to itself or to a title that reports to it', bilingual('لا يرفع المسمى إلى نفسه ولا إلى مسمى يرفع إليه', 'A job title cannot report to itself or to a title that reports to it', 'reportsToTitleId'));
  }
}

/** The code is built from the grade and the track and then frozen, so a title that has them keeps them. */
export class JobTitleGradeFrozenError extends BusinessRuleError {
  override readonly code = 'JOB_TITLE_GRADE_FROZEN';
  constructor() {
    super('The grade and track of a job title are set once (they build its code)', bilingual('تُحدَّد درجة المسمى ومساره مرة واحدة (يُبنى منهما رمزه)', 'The grade and track of a job title are set once (they build its code)', 'grade'));
  }
}

export class JobTitleGradeRequiredError extends BusinessRuleError {
  override readonly code = 'JOB_TITLE_GRADE_REQUIRED';
  constructor() {
    super('A new job title needs a grade and a track', bilingual('المسمى الجديد يحتاج درجة ومسارًا', 'A new job title needs a grade and a track', 'grade'));
  }
}

export class JobTitleSequenceTakenError extends ConflictError {
  override readonly code = 'JOB_TITLE_CODE_TAKEN';
  constructor() {
    super('This job title code is already used');
  }
}
