import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { AppConfig } from './config/app-config.service';

/** Shared by main.ts and the e2e test app so tests run the exact production pipeline. */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfig);
  const express = app as NestExpressApplication;
  // Only proxies on private networks (nginx containers) may set X-Forwarded-*.
  express.set('trust proxy', 'loopback, linklocal, uniquelocal');
  express.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );
  app.use(cookieParser());
  app.enableCors({ origin: config.get('CORS_ORIGINS'), credentials: true });
  app.useGlobalPipes(new ZodValidationPipe());
  if (!config.isProduction || config.get('SWAGGER_ENABLED')) setupSwagger(app);
}

function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Arweqah Platform API').setVersion('1.0').addCookieAuth('better-auth.session_token').build(),
  );
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document), { jsonDocumentUrl: 'api/docs/openapi.json' });
}
