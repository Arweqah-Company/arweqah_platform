import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { TitleTrack } from '@arweqah-platform/shared';
import type { DevelopmentStageRule } from '../rules/development-stage.rules';
import type { KnownTitle } from '../rules/title-import.rules';
import type { TitleContent, TitleDetail, TitleView } from '../types/org.types';

export interface TitleListFilter {
  search?: string | undefined;
  /** Units a title may sit in (the units the viewer sees); null = every unit. */
  visibleNodeIds: readonly string[] | null;
  /** Every one of these units must be the title's unit or above it. */
  ancestorIds: readonly string[];
  grade?: number | undefined;
  track?: TitleTrack | undefined;
}

export interface TitleListRow {
  id: string;
  code: string | null;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  orgNodeId: string;
  unitCode: string | null;
  unitNameAr: string;
  unitNameEn: string;
  grade: number | null;
  track: TitleTrack | null;
  reportsToTitleId: string | null;
}

/** A live title with the title it reports to and the unit it sits in. */
export interface TitleLink {
  id: string;
  upId: string | null;
  nodeId: string;
}

/** A title to write when it is made. */
export interface NewTitleValues {
  nameAr: string;
  nameEn: string;
  code: string | null;
  grade: number | null;
  track: TitleTrack | null;
  reportsToTitleId: string | null;
  content: TitleContent;
}

/** Everything about job titles beyond what `OrgRepository` already holds: the list, the card, codes, the reporting line, content and the stage rules. */
export abstract class JobTitleRepository {
  abstract list(filter: TitleListFilter): Promise<TitleListRow[]>;
  abstract detail(id: string): Promise<TitleDetail | null>;
  /** Writes a title's content and returns its new version number. */
  abstract setContent(id: string, content: TitleContent, tx: TransactionContext): Promise<number>;
  /** Serializes the building of title codes until the transaction ends (two titles never get the same sequence). */
  abstract lockCodes(tx: TransactionContext): Promise<void>;
  /** Every code ever issued, deleted titles' included. */
  abstract issuedCodes(tx?: TransactionContext): Promise<Set<string>>;
  abstract setGradeAndCode(id: string, values: { grade: number; track: TitleTrack; code: string | null }, tx: TransactionContext): Promise<void>;
  abstract setCode(id: string, code: string, tx: TransactionContext): Promise<void>;
  abstract setReportsTo(id: string, upId: string | null, tx: TransactionContext): Promise<void>;
  /** Live titles of a unit that have a grade and track but no code (the unit had no code when they were made). */
  abstract uncodedOfNode(nodeId: string, tx: TransactionContext): Promise<TitleView[]>;
  /** The reporting line of every live title. */
  abstract reportingLines(): Promise<TitleLink[]>;
  /** Writes titles with their code, grade, track, reporting line and content; returns their ids in order. */
  abstract insertTitles(nodeId: string, titles: NewTitleValues[], tx: TransactionContext): Promise<string[]>;
  /** Live titles that have a code, with their reporting line by code (what a titles file is matched against). */
  abstract knownTitles(): Promise<KnownTitle[]>;
  abstract stageRules(): Promise<DevelopmentStageRule[]>;
}
