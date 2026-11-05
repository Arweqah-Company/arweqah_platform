import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { UnitValues, VersionView } from '../types/org-version.types';

/** What a new version stores. */
export interface NewVersion extends UnitValues {
  nodeId: string;
  validFrom: string;
  validTo: string | null;
  code: string | null;
  reason: string;
  createdBy: string | null;
  appliedAt: Date | null;
}

/** The dated versions of units (FR-99). */
export abstract class OrgVersionRepository {
  /** Serializes the changes of one unit's versions until the transaction ends. */
  abstract lockNode(nodeId: string, tx: TransactionContext): Promise<void>;
  /** The versions of a unit, oldest start first. */
  abstract versionsOf(nodeId: string, tx?: TransactionContext): Promise<VersionView[]>;
  abstract insert(row: NewVersion, tx: TransactionContext): Promise<void>;
  /** Rewrites the last version on the day it starts (a same-day correction). */
  abstract overwrite(id: string, values: UnitValues & { reason: string; createdBy: string | null; appliedAt: Date | null }, tx: TransactionContext): Promise<void>;
  abstract close(id: string, validTo: string | null, tx: TransactionContext): Promise<void>;
  /** Versions of live units whose day has come and that were not copied onto the unit yet, oldest first. */
  abstract due(today: string): Promise<VersionView[]>;
  abstract markApplied(id: string, at: Date, tx: TransactionContext): Promise<void>;
  /** Copies a version's values onto the unit: the name in both languages, the switch and the charter. */
  abstract applyToNode(nodeId: string, values: UnitValues, tx: TransactionContext): Promise<void>;
  /** The units that have a version waiting for its day. */
  abstract scheduledNodeIds(today: string): Promise<Set<string>>;
}
