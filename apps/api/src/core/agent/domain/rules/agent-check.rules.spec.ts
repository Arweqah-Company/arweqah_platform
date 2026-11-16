import { describe, expect, it } from 'vitest';
import { entryLine, matchEntries, type PermissionEntry } from './agent-check.rules';

const entry = (over: Partial<PermissionEntry>): PermissionEntry => ({ permission: 'employees.create', labelAr: 'إضافة موظفين', labelEn: 'Add employees', state: 'no-permission', reason: null, holds: false, ...over });

describe('«Do I have permission to …?» (FR-151)', () => {
  it('finds the action by its name in either language, one line per permission, the reachable one first', () => {
    const entries = [entry({ state: 'allowed' }), entry({ state: 'chat-unavailable', reason: 'upload' }), entry({ permission: 'tickets.view', labelAr: 'عرض التذاكر', labelEn: 'View tickets' })];
    const found = matchEntries('هل لي صلاحية لإضافة موظف', entries);
    expect(found.map((e) => [e.permission, e.state])).toEqual([['employees.create', 'allowed']]);
    expect(matchEntries('add an employee', [entry({})]).map((e) => e.permission)).toEqual(['employees.create']);
    expect(matchEntries('weather', entries)).toEqual([]);
  });

  it('says plainly where the employee stands: can, lacks the permission (named), page hidden, or not from the chat', () => {
    expect(entryLine(entry({ state: 'allowed' }))).toContain('CAN use it');
    expect(entryLine(entry({}))).toContain('does NOT have the permission «إضافة موظفين» / «Add employees»');
    expect(entryLine(entry({ state: 'page-hidden', holds: true }))).toContain('hid its page');
    expect(entryLine(entry({ state: 'chat-unavailable', reason: 'admin-mode', holds: true }))).toContain('holds its permission, but it needs platform admin mode');
    expect(entryLine(entry({ state: 'chat-unavailable', reason: 'upload', holds: false }))).toContain('does NOT have its permission');
  });
});
