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
      'maritalStatusId', 'residencyStatusId', 'startFrom', 'startTo', 'idExpiring', 'contractEnding',
    ],
  },
  org: { columns: ['name', 'level', 'manager', 'employees', 'titles', 'status'], filters: ['level', 'status', 'employees', 'manager'] },
  companies: { columns: ['code', 'name', 'employees', 'status'], filters: ['status', 'employees'] },
  roles: { columns: ['name', 'permissions', 'users', 'assignment', 'type'], filters: ['type', 'assignment', 'holders'] },
  audit: { columns: ['when', 'actor', 'action', 'target'], filters: ['action', 'entityType', 'actor', 'from', 'to'] },
  'email-log': { columns: ['when', 'to', 'subject', 'purpose', 'status', 'details'], filters: ['status', 'purpose', 'to', 'from', 'until'] },
  tickets: {
    columns: ['number', 'title', 'desk', 'type', 'sender', 'assignee', 'status', 'neededBy', 'activity'],
    filters: ['deskId', 'typeId', 'assigneeId', 'status'],
  },
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
