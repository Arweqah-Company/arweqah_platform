import { describe, expect, it } from 'vitest';
import { objectionRefusal } from './task-objection.rules';

const ok = { isAssignee: true, isCreator: false, status: 'todo' as const, hasOpenObjection: false, archived: false };

describe('Task objection rules (FR-52)', () => {
  it('lets the assignee object to a to-do task somebody else gave them', () => {
    expect(objectionRefusal(ok)).toBeNull();
  });

  it('refuses everybody else and every other situation, with the reason', () => {
    expect(objectionRefusal({ ...ok, isAssignee: false })).toBe('NOT_ASSIGNEE');
    expect(objectionRefusal({ ...ok, isCreator: true })).toBe('OWN_TASK');
    expect(objectionRefusal({ ...ok, status: 'in_progress' })).toBe('NOT_TODO');
    expect(objectionRefusal({ ...ok, hasOpenObjection: true })).toBe('ALREADY_OBJECTED');
    expect(objectionRefusal({ ...ok, archived: true })).toBe('ARCHIVED');
  });
});
