import { rankBy } from './agent-guide.rules';

export type PermissionState = 'allowed' | 'no-permission' | 'page-hidden' | 'chat-unavailable';

/** One thing the platform can do, as the employee's question can match it, and where this employee stands with it. */
export interface PermissionEntry {
  permission: string;
  labelAr: string;
  labelEn: string;
  state: PermissionState;
  /** `chat-unavailable`: why the chat cannot do it, and whether the employee holds its permission. */
  reason: string | null;
  holds: boolean;
}

const ENTRIES_SHOWN = 5;

/** The entries that best match what the employee asks about, one per permission. */
export function matchEntries(question: string, entries: readonly PermissionEntry[]): PermissionEntry[] {
  // The first entry of a permission wins (the ones the chat can reach come before the ones it cannot).
  const unique = [...new Map([...entries].reverse().map((e) => [e.permission, e])).values()];
  return rankBy(question, unique, (e) => ({ title: `${e.labelAr} ${e.labelEn}`, body: '' }), ENTRIES_SHOWN);
}

const UNAVAILABLE: Record<string, string> = {
  'admin-mode': 'needs platform admin mode: do it from its page',
  upload: 'needs a file upload: do it from its page',
  import: 'is an import from a file: do it from its page',
  'before-mfa': 'is part of signing in: do it from its page',
  'sensitive-area': 'cannot be done from the chat: do it from its page',
  hidden: 'cannot be done from the chat: do it from its page',
  'unsupported-schema': 'cannot be done from the chat: do it from its page',
};

/** One line for the model: what the platform has and what this employee may do with it. */
export function entryLine(entry: PermissionEntry): string {
  const name = `${entry.labelEn} / ${entry.labelAr}`;
  if (entry.state === 'allowed') return `- ${name}: the platform has it and this employee CAN use it (it is in their list).`;
  if (entry.state === 'no-permission') return `- ${name}: the platform has it and this employee does NOT have the permission «${entry.labelAr}» / «${entry.labelEn}». An administrator can give it.`;
  if (entry.state === 'page-hidden') return `- ${name}: the platform has it; this employee holds the permission but an administrator hid its page from their roles.`;
  const held = entry.holds ? 'This employee holds its permission, but it' : 'This employee does NOT have its permission «' + entry.labelAr + '» / «' + entry.labelEn + '», and it also';
  return `- ${name}: the platform has it. ${held} ${UNAVAILABLE[entry.reason ?? ''] ?? 'cannot be done from the chat'}.`;
}
