import type { TransactionContext } from '../domain/transaction-context';

export type { TransactionContext };

/** Unit of Work: runs a use case writing several aggregates in one transaction. */
export abstract class TransactionRunner {
  abstract run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
