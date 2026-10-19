import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionContext, TransactionRunner } from '../application/transaction-runner';

class TypeOrmTransaction implements TransactionContext {
  readonly id = Symbol('tx');
  constructor(readonly manager: EntityManager) {}
}

@Injectable()
export class TypeOrmTransactionRunner extends TransactionRunner {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => work(new TypeOrmTransaction(manager)));
  }
}

/** Repositories call this to join the caller's transaction (or use their default manager). */
export function managerOf(tx: TransactionContext | undefined, fallback: EntityManager): EntityManager {
  return tx instanceof TypeOrmTransaction ? tx.manager : fallback;
}
