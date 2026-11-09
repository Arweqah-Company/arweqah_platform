import type { ScopeFilter } from '../../../../core/access/domain/access-context';

/** A person of the viewer's team, as the career team page needs them. */
export interface TeamPerson {
  employeeId: string;
  userId: string;
  name: string;
  titleId: string | null;
}

/** What «my career team» asks of the employees (implemented by the employees module): the people a view scope reaches, never the viewer. */
export abstract class CareerTeamPort {
  abstract members(filter: ScopeFilter, search?: string): Promise<TeamPerson[]>;
  /** One person when the scope reaches them (a person outside it is null, which the caller answers as 404). */
  abstract member(filter: ScopeFilter, employeeId: string): Promise<TeamPerson | null>;
}
