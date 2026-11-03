import { CorePermission, EMPLOYEE_DEFAULT_PERMISSIONS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { TASK_PERMISSIONS } from './tasks.permissions';

const TASK_KEYS = Object.values(CorePermission).filter((key) => key.startsWith('tasks.'));

describe('Task permissions (FR-48, FR-54)', () => {
  it('declares every tasks key with both labels and the module', () => {
    expect(TASK_PERMISSIONS.map((p) => p.key).sort()).toEqual([...TASK_KEYS].sort());
    for (const p of TASK_PERMISSIONS) {
      expect(p.module).toBe('tasks');
      expect(p.labelAr.length).toBeGreaterThan(0);
      expect(p.labelEn.length).toBeGreaterThan(0);
      expect(p.scopes.length).toBeGreaterThan(0);
    }
  });

  it('gives the Employee role only the keys of the person\'s own tasks and conversations, never the team, approval, policy or export keys (decision 155)', () => {
    const given = new Set(EMPLOYEE_DEFAULT_PERMISSIONS.map((p) => p.key as string));
    const P = CorePermission;
    const own = [P.TasksView, P.TasksCreate, P.TasksUpdate, P.TasksChangeStatus, P.TasksCommentView, P.TasksCommentAdd, P.TasksCommentReply, P.TasksCommentMention, P.TasksCommentEdit, P.TasksCommentDelete];
    expect(TASK_KEYS.filter((key) => given.has(key)).sort()).toEqual([...own].sort());
    for (const key of [P.TasksTeamView, P.TasksMatrixView, P.TasksAssign, P.TasksApprove, P.TasksReject, P.TasksReview, P.TasksPoliciesView, P.TasksPoliciesEdit, P.TasksExport, P.TasksCommentDeleteAny, P.TasksCommentRulesEdit]) {
      expect(given.has(key), key).toBe(false);
    }
  });
});
