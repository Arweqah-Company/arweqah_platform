/** Audit action names of the org module. Services use these constants, never inline strings. */
export const ORG_AUDIT = {
  companyCreated: 'company.created',
  companyUpdated: 'company.updated',
  companyDeleted: 'company.deleted',
  levelsChanged: 'org.levels.changed',
  levelsCopied: 'org.levels.copied',
  unitCreated: 'org.unit.created',
  unitUpdated: 'org.unit.updated',
  unitMoved: 'org.unit.moved',
  unitDeleted: 'org.unit.deleted',
  jobTitleCreated: 'org.job-title.created',
  jobTitleUpdated: 'org.job-title.updated',
  jobTitleDeleted: 'org.job-title.deleted',
} as const;
