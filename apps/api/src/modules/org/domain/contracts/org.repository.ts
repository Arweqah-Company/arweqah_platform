import type { ManagementMode } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { ParentRules } from '../rules/org-unit-types.rules';
import type { CompanyView, LevelView, Names, NodePath, NodeView, TitleView } from '../types/org.types';

export interface LevelsWrite {
  removeIds: string[];
  items: (Names & { id?: string; sortOrder: number; isAssignable: boolean })[];
}

export interface NewNode extends Names {
  companyId: string;
  levelId: string;
  parentId: string | null;
  managerId: string | null;
  startDate: string;
  sortOrder: number;
  code: string | null;
  managementMode: ManagementMode | null;
}

export abstract class OrgRepository {
  // Companies
  abstract companies(): Promise<CompanyView[]>;
  abstract company(id: string): Promise<CompanyView | null>;
  /** The company that holds every unit of the structure: the one coded `ARW`, else the oldest. */
  abstract groupCompanyId(): Promise<string | null>;
  abstract companyCodeTaken(code: string, exceptId?: string): Promise<boolean>;
  abstract insertCompany(data: Names & { code: string; isActive: boolean }, tx: TransactionContext): Promise<string>;
  abstract updateCompany(id: string, data: Names & { code: string; isActive: boolean }, tx: TransactionContext): Promise<void>;
  abstract softDeleteCompany(id: string, tx: TransactionContext): Promise<void>;
  abstract unitsCountOfCompany(companyId: string): Promise<number>;

  // Unit types (group-wide) and the «who may be created under whom» table
  abstract levels(): Promise<LevelView[]>;
  abstract level(id: string): Promise<LevelView | null>;
  abstract unitCountsByLevel(): Promise<Map<string, number>>;
  abstract levelRules(): Promise<ParentRules>;
  /** Adds, renames and removes types; an added type gets a generated key. */
  abstract applyLevels(write: LevelsWrite, tx: TransactionContext): Promise<void>;
  abstract replaceLevelRules(rules: ParentRules, tx: TransactionContext): Promise<void>;

  // Units
  abstract nodes(): Promise<NodeView[]>;
  abstract node(id: string): Promise<NodeView | null>;
  abstract nodesByIds(ids: string[]): Promise<NodeView[]>;
  abstract insertNode(data: NewNode, tx: TransactionContext): Promise<string>;
  abstract updateNode(id: string, data: Names & { managerId: string | null; startDate: string; isActive: boolean }, tx: TransactionContext): Promise<void>;
  abstract moveNode(id: string, parentId: string | null, tx: TransactionContext): Promise<void>;
  abstract setNodeMode(id: string, mode: ManagementMode | null, tx: TransactionContext): Promise<void>;
  abstract setNodeCode(id: string, code: string, tx: TransactionContext): Promise<void>;
  abstract softDeleteNodes(ids: string[], tx: TransactionContext): Promise<void>;
  abstract childrenCount(nodeId: string): Promise<number>;
  /** The given units and every unit below them. */
  abstract descendantIds(nodeIds: string[]): Promise<string[]>;
  abstract pathsOf(nodeIds: string[]): Promise<Map<string, NodePath>>;
  /** What applies to each unit: the closest explicit mode going up the closure (per company when none is set anywhere above). */
  abstract effectiveModesOf(nodeIds: string[]): Promise<Map<string, ManagementMode>>;
  /** Serializes the creation of children under one parent (or at the root) until the transaction ends, so two creations never read the same free code slot. */
  abstract lockChildren(parentId: string | null, tx: TransactionContext): Promise<void>;
  abstract childCodes(parentId: string | null, tx: TransactionContext): Promise<string[]>;
  abstract codeTaken(code: string, tx: TransactionContext): Promise<boolean>;
  /** Live codes that fit a LIKE pattern (`_` is one character): every code a new unit of a given shape could collide with, wherever the unit sits now. */
  abstract codesLike(pattern: string, tx: TransactionContext): Promise<string[]>;

  // Job titles
  abstract titlesOfNodes(nodeIds: string[]): Promise<TitleView[]>;
  abstract title(id: string): Promise<TitleView | null>;
  abstract titlesByIds(ids: string[]): Promise<TitleView[]>;
  abstract updateTitle(id: string, data: Names & { isActive: boolean }, tx: TransactionContext): Promise<void>;
  abstract softDeleteTitles(ids: string[], tx: TransactionContext): Promise<void>;
  abstract activeTitleCount(nodeId: string): Promise<number>;
}
