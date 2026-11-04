import type { TransactionContext, TransactionRunner } from './transaction-runner';

/** Thrown inside a rehearsal to roll the transaction back while carrying what the work returned. */
class Rehearsed<T> extends Error {
  constructor(readonly result: T) {
    super('rehearsal');
  }
}

/**
 * Runs `work` exactly as it would run for real, with every rule and every constraint of the database, and then rolls it back.
 * A preview that cannot disagree with the real run: what is refused here is refused there. Side effects outside the transaction must not be in `work`.
 */
export async function rehearse<T>(runner: TransactionRunner, work: (tx: TransactionContext) => Promise<T>): Promise<T> {
  try {
    await runner.run(async (tx) => {
      throw new Rehearsed(await work(tx));
    });
  } catch (error) {
    if (error instanceof Rehearsed) return error.result as T;
    throw error;
  }
  throw new Error('A rehearsal always ends by rolling back');
}
