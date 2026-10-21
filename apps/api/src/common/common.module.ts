import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';
import { Clock, SystemClock } from './application/clock';
import { TransactionRunner } from './application/transaction-runner';
import { BlindIndex } from './application/blind-index';
import { FieldCipher } from './application/field-cipher';
import { TypeOrmTransactionRunner } from './infrastructure/typeorm-transaction-runner';

@Global()
@Module({
  providers: [
    { provide: TransactionRunner, useClass: TypeOrmTransactionRunner },
    { provide: Clock, useClass: SystemClock },
    { provide: FieldCipher, inject: [AppConfig], useFactory: (c: AppConfig) => new FieldCipher(c.get('FIELD_ENCRYPTION_KEY')) },
    { provide: BlindIndex, inject: [AppConfig], useFactory: (c: AppConfig) => new BlindIndex(c.get('BLIND_INDEX_KEY')) },
  ],
  exports: [TransactionRunner, Clock, FieldCipher, BlindIndex],
})
export class CommonModule {}
