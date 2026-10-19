import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/** Typed access to configuration; no string keys scattered across the codebase. */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }

  get microsoft(): { clientId: string; clientSecret: string; tenantId: string } | null {
    const clientId = this.get('MICROSOFT_CLIENT_ID');
    const clientSecret = this.get('MICROSOFT_CLIENT_SECRET');
    const tenantId = this.get('MICROSOFT_TENANT_ID');
    return clientId && clientSecret && tenantId ? { clientId, clientSecret, tenantId } : null;
  }
}
