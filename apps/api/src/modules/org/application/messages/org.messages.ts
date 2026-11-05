/** Audit action names of the org module. Services use these constants, never inline strings. */
export const ORG_AUDIT = {
  companyCreated: 'company.created',
  companyUpdated: 'company.updated',
  companyDeleted: 'company.deleted',
  levelsChanged: 'org.levels.changed',
  levelRulesChanged: 'org.level-rules.changed',
  unitCreated: 'org.unit.created',
  unitUpdated: 'org.unit.updated',
  unitMoved: 'org.unit.moved',
  unitDeleted: 'org.unit.deleted',
  unitModeChanged: 'org.unit.mode-changed',
  unitCodeSet: 'org.unit.code-set',
  jobTitleCreated: 'org.job-title.created',
  jobTitleUpdated: 'org.job-title.updated',
  jobTitleDeleted: 'org.job-title.deleted',
  jobTitleContentChanged: 'org.job-title.content-changed',
  jobTitlesImported: 'org.job-titles.imported',
  unitCharterChanged: 'org.unit.charter-changed',
  unitVersionApplied: 'org.unit.version-applied',
  unitLeaderSet: 'org.unit.leader-set',
  unitLeaderEnded: 'org.unit.leader-ended',
  unitLeaderRemoved: 'org.unit.leader-removed',
} as const;

/** The reason written on a dated change when the caller gave none (an edit of a unit from its form). */
export const DEFAULT_VERSION_REASON = 'Edited from the unit form';
