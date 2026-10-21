import './seed-env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext, LogLevel } from '@nestjs/common';
import { AppModule } from '../../app.module';

/** Boots the application without HTTP, runs `work`, always closes the app, and exits non-zero when it fails. */
export function runWithSeedApp(logger: LogLevel[], work: (app: INestApplicationContext) => Promise<void>): void {
  void (async () => {
    const app = await NestFactory.createApplicationContext(AppModule, { logger });
    try {
      await work(app);
    } finally {
      await app.close();
    }
  })().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
