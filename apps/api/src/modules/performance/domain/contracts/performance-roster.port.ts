import type { ScopeFilter } from '../../../../core/access/domain/access-context';

/** An active employee who holds a title, as the evaluation needs them. */
export interface RosterPerson {
  employeeId: string;
  userId: string;
  name: string;
  titleId: string;
  managerUserId: string | null;
  managerName: string | null;
}

/** What the evaluation asks of the employees (implemented by the employees module, so this module never depends on it). */
export abstract class PerformanceRosterPort {
  /** Every active employee who holds a title (the people a cycle evaluates). */
  abstract everyone(): Promise<RosterPerson[]>;
  /** The employee behind a user, or null when they hold no title or are not active. */
  abstract person(userId: string): Promise<RosterPerson | null>;
  /** The minutes of the learning units whose proof was approved (the «learning» part of the extra component). */
  abstract approvedLearningMinutes(employeeId: string): Promise<number>;
}

/** A person of the viewer's team with the two managers above them, as the evaluation needs them. */
export interface TeamPerson extends RosterPerson {
  upperManagerUserId: string | null;
  upperManagerName: string | null;
}

/** What «team evaluation» asks of the employees (implemented by the employees module): the people a scope reaches, never the viewer. */
export abstract class PerformanceTeamPort {
  abstract members(filter: ScopeFilter, options: { search?: string; directOnly?: boolean }): Promise<TeamPerson[]>;
  /** One person when the scope reaches them; a person outside it is null (the caller answers 404). */
  abstract member(filter: ScopeFilter, employeeId: string): Promise<TeamPerson | null>;
}

/** The development stage of a title (from its grade and track), or null when no rule covers it. */
export abstract class PerformanceStagePort {
  abstract stageOf(titleId: string): Promise<{ stage: number; hoursPerYear: number } | null>;
  abstract titleNames(titleId: string): Promise<{ nameAr: string; nameEn: string }>;
}
