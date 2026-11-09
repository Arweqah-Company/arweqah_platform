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

/** The development stage of a title (from its grade and track), or null when no rule covers it. */
export abstract class PerformanceStagePort {
  abstract stageOf(titleId: string): Promise<{ stage: number; hoursPerYear: number } | null>;
}
