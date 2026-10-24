import type { TaskPolicyKey } from '@arweqah-platform/shared';

/** The numbers of the rules, grouped by topic (each group is a section of the page). */
export const POLICY_SECTIONS: { id: string; keys: TaskPolicyKey[] }[] = [
  { id: 'time', keys: ['urgentDays', 'reminderDaysBefore', 'backdateDays'] },
  { id: 'follow', keys: ['staleDays', 'objectionWorkingDays'] },
  { id: 'reports', keys: ['digestWeekday', 'standaloneRetentionDays'] },
];
