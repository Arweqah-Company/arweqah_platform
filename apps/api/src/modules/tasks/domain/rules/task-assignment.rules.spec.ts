import { describe, expect, it } from 'vitest';
import { decideAssignment, type AssignmentFacts } from './task-assignment.rules';

const facts = (over: Partial<AssignmentFacts> = {}): AssignmentFacts => ({
  creatorUserId: 'a',
  assigneeUserId: 'b',
  inAssignReach: false,
  isCreatorsDepartmentManager: false,
  shareTicket: false,
  isProjectMember: false,
  ...over,
});

describe('Task assignment (FR-48)', () => {
  it('lets anybody give a task to themselves, which then waits for approval', () => {
    expect(decideAssignment(facts({ assigneeUserId: 'a' }))).toEqual({ allowed: true, selfAssigned: true });
  });

  it('lets a manager assign inside their reach and an employee ask their department manager', () => {
    expect(decideAssignment(facts({ inAssignReach: true }))).toEqual({ allowed: true, selfAssigned: false });
    expect(decideAssignment(facts({ isCreatorsDepartmentManager: true }))).toEqual({ allowed: true, selfAssigned: false });
  });

  it('lets people on the same ticket, and project members, assign each other', () => {
    expect(decideAssignment(facts({ shareTicket: true })).allowed).toBe(true);
    expect(decideAssignment(facts({ isProjectMember: true })).allowed).toBe(true);
  });

  it('refuses everybody else', () => {
    expect(decideAssignment(facts())).toEqual({ allowed: false, selfAssigned: false });
  });
});
