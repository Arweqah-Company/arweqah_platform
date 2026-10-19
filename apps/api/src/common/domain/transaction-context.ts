/** Opaque handle passed to repositories that must join the caller's transaction. */
export interface TransactionContext {
  readonly id: symbol;
}
