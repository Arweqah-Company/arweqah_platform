import type { DirectoryLevel } from '@arweqah-platform/shared';

/** The part of an employee record that decides who is whose teammate. */
export interface TeamMember {
  id: string;
  orgNodeId: string | null;
  isSystemAccount?: boolean;
}

/** A teammate is another person, not a system account, in the very same unit as the viewer (not its sub-units, not the units above). Someone with no unit has no team. */
export function isTeammate(viewer: TeamMember, employee: TeamMember): boolean {
  return !!viewer.orgNodeId && viewer.orgNodeId === employee.orgNodeId && viewer.id !== employee.id && !employee.isSystemAccount;
}

/** What the viewer has to do with the colleague whose profile they open. */
export interface ViewerRelation {
  /** The viewer may open the whole employee record (HR, or a leader over their people). */
  canOpenRecord: boolean;
  isSelf: boolean;
  /** The colleague reports, directly or not, to the viewer. */
  isInManagerChain: boolean;
}

/** The level of a colleague's profile: the whole record for who may open it, more for the person and their managers, the basics for everyone else. */
export function profileLevel(relation: ViewerRelation): DirectoryLevel {
  if (relation.canOpenRecord) return 'full';
  return relation.isSelf || relation.isInManagerChain ? 'extended' : 'basic';
}
