import type { NoticeAudienceOptionsDto } from '@arweqah-platform/shared';
import type { UnitPlace } from '../types/notice.types';
import type { AudienceRuleRow } from '../types/notice.types';

export interface RuleName {
  type: string;
  refId: string;
  nameAr: string;
  nameEn: string;
}

/** What the notices need to know about the organization and the people (read-only SQL over the org, employee and user tables). */
export abstract class NoticeDirectory {
  /** Where the person sits now (their employee record), or null. */
  abstract placeOf(userId: string): Promise<UnitPlace | null>;
  /**
   * Who approves a notice of an author who sits in `unitId`: the manager of that unit; when that is the author, the manager of the closest unit above whose manager is
   * somebody else. Null when there is nobody (a platform administrator then approves).
   */
  abstract approverFor(authorUserId: string, unitId: string | null): Promise<string | null>;
  /** The units, titles and groups the rules name that really exist (an unknown id is reported by the caller). */
  abstract existingRefs(ids: { units: string[]; titles: string[]; groups: string[] }): Promise<{ units: Set<string>; titles: Set<string>; groups: Set<string> }>;
  /** Every active unit, job title and group of people whose name contains `search` (all of them without it): the choices of the audience picker. */
  abstract audienceOptions(search: string | undefined): Promise<NoticeAudienceOptionsDto>;
  abstract ruleNames(rules: AudienceRuleRow[]): Promise<Map<string, RuleName>>;
  /** The names of the people (employee name, else the account's). */
  abstract names(userIds: string[]): Promise<Map<string, string>>;
  abstract activeUserIds(userIds: string[]): Promise<Set<string>>;
}
