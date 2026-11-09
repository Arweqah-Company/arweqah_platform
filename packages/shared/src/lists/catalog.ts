import { z } from 'zod';

/**
 * Every list of the platform with the columns it can show and the filters it can offer. An administrator chooses
 * which of them appear (one setting for everyone). The first column of a list is its name and always stays.
 */
export const LIST_CATALOG = {
  employees: {
    columns: ['number', 'name', 'company', 'unit', 'title', 'status'],
    filters: [
      'companyId', 'status', 'relationTypeId', 'orgNodeId', 'jobTitleId', 'contractTypeId', 'nationalityId', 'gender', 'workMode',
      'maritalStatusId', 'residencyStatusId', 'startFrom', 'startTo', 'idExpiring', 'contractEnding', 'needsPlacement',
    ],
  },
  directory: { columns: ['name', 'title', 'unit', 'company', 'email', 'phone'], filters: ['companyId', 'jobTitleId'] },
  org: { columns: ['name', 'code', 'level', 'mode', 'leader', 'manager', 'employees', 'titles', 'status'], filters: ['level', 'mode', 'status', 'employees', 'manager'] },
  'job-titles': { columns: ['code', 'name', 'unit', 'grade', 'track', 'occupants'], filters: ['sector', 'department', 'section', 'grade', 'track', 'vacant'] },
  'career-learning': { columns: ['priority', 'unit', 'duration', 'language', 'state', 'link'], filters: ['priority', 'language', 'state'] },
  'career-certificates': { columns: ['employee', 'unit', 'proof', 'minutes', 'submitted', 'status'], filters: ['kind', 'status'] },
  'career-content': { columns: ['code', 'name', 'unit', 'grade', 'track', 'status', 'holders'], filters: ['status', 'grade', 'track', 'unit'] },
  companies: { columns: ['code', 'name', 'employees', 'status'], filters: ['status', 'employees'] },
  roles: { columns: ['name', 'origin', 'permissions', 'users', 'assignment', 'kind', 'type'], filters: ['type', 'assignment', 'kind', 'company', 'holders'] },
  exceptions: { columns: ['person', 'kind', 'target', 'scope', 'grantedBy', 'grantedAt', 'expires'], filters: ['kind', 'person', 'grantedBy', 'expiring'] },
  'my-access': { columns: ['permission', 'module', 'scope', 'source'], filters: ['module', 'scope', 'source'] },
  audit: { columns: ['when', 'actor', 'category', 'action'], filters: ['category', 'action', 'actor', 'from', 'to'] },
  'email-log': { columns: ['when', 'to', 'subject', 'purpose', 'status', 'details'], filters: ['status', 'purpose', 'to', 'from', 'until'] },
  'translation-providers': { columns: ['provider', 'status', 'tested', 'active'], filters: ['status', 'active'] },
  'email-providers': { columns: ['provider', 'status', 'tested', 'active'], filters: ['status', 'active'] },
  'captcha-providers': { columns: ['provider', 'status', 'tested', 'active'], filters: ['status', 'active'] },
  'email-templates': { columns: ['template', 'area', 'status', 'updated'], filters: ['area', 'status'] },
  'notification-templates': { columns: ['template', 'area', 'status', 'updated'], filters: ['area', 'status'] },
  'tour-steps': { columns: ['title', 'order', 'tour', 'status', 'updated'], filters: ['tour', 'status', 'customised'] },
  tickets: {
    columns: ['number', 'title', 'desk', 'type', 'sender', 'assignee', 'status', 'neededBy', 'activity'],
    filters: ['deskId', 'typeId', 'assigneeId', 'status'],
  },
  tasks: {
    columns: ['title', 'assignee', 'dueDate', 'priority', 'status', 'tag', 'estimate'],
    filters: ['status', 'priority', 'assigneeId', 'tagId', 'stale', 'overdue'],
  },
  'task-tags': { columns: ['name', 'department', 'status'], filters: ['status'] },
  notifications: { columns: [], filters: ['state', 'from', 'until'] },
} as const satisfies Record<string, { columns: readonly string[]; filters: readonly string[] }>;

export type ListKey = keyof typeof LIST_CATALOG;
export const LIST_KEYS = Object.keys(LIST_CATALOG) as ListKey[];

export const listSettingsInputSchema = z.strictObject({
  hiddenColumns: z.array(z.string().max(40)).max(30),
  hiddenFilters: z.array(z.string().max(40)).max(30),
});
export type ListSettingsInput = z.infer<typeof listSettingsInputSchema>;

/** What is hidden in one list; lists with nothing hidden are not in the map. */
export interface ListSettingDto {
  hiddenColumns: string[];
  hiddenFilters: string[];
}
export type ListSettingsDto = Partial<Record<ListKey, ListSettingDto>>;
