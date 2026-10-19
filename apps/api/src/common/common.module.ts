import { Global, Module } from '@nestjs/common';
import { Clock, SystemClock } from './application/clock';
import { TransactionRunner } from './application/transaction-runner';
import { TypeOrmTransactionRunner } from './infrastructure/typeorm-transaction-runner';

@Global()
@Module({
  providers: [
    { provide: TransactionRunner, useClass: TypeOrmTransactionRunner },
    { provide: Clock, useClass: SystemClock },
  ],
  exports: [TransactionRunner, Clock],
})
export class CommonModule {}
