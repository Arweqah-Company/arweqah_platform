import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { NoticeChannel } from '../entities/notice.entities';
import type { CandidateRow, ChannelRow, EmployeeFacts, NewChannel, UnitFacts, UnitOption, WriterRow } from '../types/notice.types';

/** A scope the way the SQL of the writers' lists takes it: everyone, a company, or these units (with those managed per company). */
export type PeopleScope = { kind: 'all' } | { kind: 'company'; companyId: string } | { kind: 'nodes'; ids: readonly string[]; restrictedIds: readonly string[]; companyId: string | null } | { kind: 'none' };

export abstract class NoticeChannelRepository {
  /** The writers of a channel the scope reaches. */
  abstract writers(channelId: string, scope: PeopleScope, filters: { search?: string; unitId?: string }): Promise<WriterRow[]>;
  abstract writerOf(channelId: string, userId: string): Promise<WriterRow | null>;
  abstract insertWriter(channelId: string, userId: string, tx: TransactionContext): Promise<boolean>;
  abstract removeWriter(channelId: string, userId: string, tx: TransactionContext): Promise<boolean>;
  /** Active employees inside the scope who are not writers in the channel, matching the name (any part of it, from the first letter). */
  abstract candidates(channelId: string, scope: PeopleScope, search: string | undefined): Promise<CandidateRow[]>;
  abstract employee(employeeId: string): Promise<EmployeeFacts | null>;
  /** Makes the first two channels (with their units), their writer roles with the fixed keys and the settings row when they are missing (the migration does the same for a real database; the tests run it after the tables are emptied). */
  abstract ensureSetup(): Promise<void>;

  // ---- the channels themselves (FR-177)
  /** Every channel with its unit, its writers and notices counted. */
  abstract channelRows(code?: string): Promise<ChannelRow[]>;
  abstract usedCodes(): Promise<Set<string>>;
  /** Is the Arabic or the English name (without regard to case) another channel's? */
  abstract nameTaken(nameAr: string, nameEn: string, exceptId?: string): Promise<boolean>;
  abstract unit(id: string): Promise<UnitFacts | null>;
  /** The active units inside the scope, matching the name. */
  abstract units(scope: PeopleScope, search: string | undefined): Promise<UnitOption[]>;
  /** The channel and its system writer role with the fixed keys, together. */
  abstract createChannel(input: NewChannel, tx: TransactionContext): Promise<NoticeChannel>;
  /** The names of the channel and of its role. */
  abstract renameChannel(channelId: string, names: { nameAr: string; nameEn: string; roleNameAr: string; roleNameEn: string }, tx: TransactionContext): Promise<void>;
  abstract setActive(channelId: string, isActive: boolean, tx: TransactionContext): Promise<void>;
  /** Takes the channel's role from every writer; answers who lost it. */
  abstract revokeRoleFromWriters(channelId: string, roleId: string, tx: TransactionContext): Promise<string[]>;
  /** Gives the channel's role to every writer who has an active account; answers who got it. */
  abstract grantRoleToWriters(channelId: string, roleId: string, grantedBy: string | null, tx: TransactionContext): Promise<string[]>;
  abstract hasNotices(channelId: string): Promise<boolean>;
  /** Deletes the channel, its writers and its role; answers who held the role. */
  abstract deleteChannel(channel: { id: string; writerRoleId: string }, tx: TransactionContext): Promise<string[]>;
}
