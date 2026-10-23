import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { DeskRecord, DeskSettingsValues, TypeRecord, TypeValues } from '../types/ticket.types';

export abstract class TicketDeskRepository {
  abstract find(deskId: string): Promise<DeskRecord | null>;
  abstract findMany(deskIds: string[]): Promise<DeskRecord[]>;
  /** Creates the desk on first save, otherwise updates it. */
  abstract save(deskId: string, values: DeskSettingsValues, tx: TransactionContext): Promise<void>;
  abstract typesOfDesks(deskIds: string[]): Promise<TypeRecord[]>;
  abstract type(typeId: string): Promise<TypeRecord | null>;
  abstract insertType(deskId: string, values: TypeValues, tx: TransactionContext): Promise<string>;
  abstract updateType(typeId: string, values: TypeValues, tx: TransactionContext): Promise<void>;
  /** True when the ticket type has tickets (it can then only be deactivated). */
  abstract typeHasTickets(typeId: string): Promise<boolean>;
  abstract deleteType(typeId: string, tx: TransactionContext): Promise<void>;
}
