import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppConfig } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  // Better Auth parses its own bodies; the auth module re-adds parsers for other routes.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(app.get(AppConfig).get('PORT'), '0.0.0.0');
}

void bootstrap();
