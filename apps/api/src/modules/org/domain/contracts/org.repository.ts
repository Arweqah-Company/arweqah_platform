import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { CompanyView, LevelView, Names, NodePath, NodeView, TitleView } from '../types/org.types';

export interface LevelsWrite {
  removeIds: string[];
  items: (Names & { id?: string; sortOrder: number; isAssignable: boolean; templateCode?: string | null })[];
}

export abstract class OrgRepository {
  // Companies
  abstract companies(): Promise<CompanyView[]>;
  abstract company(id: string): Promise<CompanyView | null>;
  abstract companyCodeTaken(code: string, exceptId?: string): Promise<boolean>;
  abstract insertCompany(data: Names & { code: string; isActive: boolean }, tx: TransactionContext): Promise<string>;
  abstract updateCompany(id: string, data: Names & { code: string; isActive: boolean }, tx: TransactionContext): Promise<void>;
  abstract softDeleteCompany(id: string, tx: TransactionContext): Promise<void>;
  abstract unitsCountOfCompany(companyId: string): Promise<number>;

  // Levels
  abstract levels(companyId: string): Promise<LevelView[]>;
  abstract level(id: string): Promise<LevelView | null>;
  abstract unitCountsByLevel(companyId: string): Promise<Map<string, number>>;
  abstract applyLevels(companyId: string, write: LevelsWrite, tx: TransactionContext): Promise<void>;
  abstract templateLevels(): Promise<(Names & { sortOrder: number; isAssignable: boolean; templateCode: string })[]>;

  // Units
  abstract nodes(companyId: string): Promise<NodeView[]>;
  abstract node(id: string): Promise<NodeView | null>;
  abstract nodesByIds(ids: string[]): Promise<NodeView[]>;
  abstract nodesOfLevels(levelIds: string[]): Promise<NodeView[]>;
  abstract insertNode(
    data: Names & { companyId: string; levelId: string; parentId: string | null; managerId: string | null; startDate: string; sortOrder: number },
    tx: TransactionContext,
  ): Promise<string>;
  abstract updateNode(id: string, data: Names & { managerId: string | null; startDate: string; isActive: boolean }, tx: TransactionContext): Promise<void>;
  abstract moveNode(id: string, parentId: string | null, tx: TransactionContext): Promise<void>;
  abstract softDeleteNodes(ids: string[], tx: TransactionContext): Promise<void>;
  abstract childrenCount(nodeId: string): Promise<number>;
  /** The given units and every unit below them. */
  abstract descendantIds(nodeIds: string[]): Promise<string[]>;
  abstract pathsOf(nodeIds: string[]): Promise<Map<string, NodePath>>;

  // Job titles
  abstract titlesOfNodes(nodeIds: string[]): Promise<TitleView[]>;
  abstract title(id: string): Promise<TitleView | null>;
  abstract titlesByIds(ids: string[]): Promise<TitleView[]>;
  abstract insertTitles(nodeId: string, titles: Names[], tx: TransactionContext): Promise<string[]>;
  abstract updateTitle(id: string, data: Names & { isActive: boolean }, tx: TransactionContext): Promise<void>;
  abstract softDeleteTitles(ids: string[], tx: TransactionContext): Promise<void>;
  abstract activeTitleCount(nodeId: string): Promise<number>;
}
