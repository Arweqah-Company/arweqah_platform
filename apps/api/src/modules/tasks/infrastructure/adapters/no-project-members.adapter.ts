import { Injectable } from '@nestjs/common';
import { TaskProjectMembers } from '../../domain/contracts/task-project-members.port';

/**
 * Stand-in until the projects module exists: no project has members and none has an approver. When that module is built,
 * a real adapter replaces this one (docs/plans/phase-3-tasks.md §1.1).
 */
@Injectable()
export class NoProjectMembersAdapter extends TaskProjectMembers {
  isMember(): Promise<boolean> {
    return Promise.resolve(false);
  }

  approverOf(): Promise<string | null> {
    return Promise.resolve(null);
  }
}
