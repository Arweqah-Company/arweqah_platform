import { readFileSync } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

export interface MicrosoftSettings {
  clientId: string;
  tenantId: string;
  credential: { kind: 'secret'; secret: string } | { kind: 'certificate'; privateKeyPem: string; thumbprint: string };
}

export interface TranslateSettings {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

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

  /** Amazon Translate keys; null when they are not set, which turns the translation helper off. */
  get translate(): TranslateSettings | null {
    const accessKeyId = this.get('TRANSLATE_AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.get('TRANSLATE_AWS_SECRET_ACCESS_KEY');
    return accessKeyId && secretAccessKey ? { region: this.get('TRANSLATE_AWS_REGION'), accessKeyId, secretAccessKey } : null;
  }

  /** Microsoft sign-in: the app's identity is proven by a client secret or by a certificate; null when it is not set up. */
  get microsoft(): MicrosoftSettings | null {
    const clientId = this.get('MICROSOFT_CLIENT_ID');
    const tenantId = this.get('MICROSOFT_TENANT_ID');
    const secret = this.get('MICROSOFT_CLIENT_SECRET');
    if (!clientId || !tenantId) return null;
    if (secret) return { clientId, tenantId, credential: { kind: 'secret', secret } };
    const thumbprint = this.get('MICROSOFT_CERT_THUMBPRINT');
    const keyFile = this.get('MICROSOFT_CERT_PRIVATE_KEY_FILE');
    // The path comes from the operator's environment, never from a request.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const privateKeyPem = keyFile ? readFileSync(keyFile, 'utf8') : this.get('MICROSOFT_CERT_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    return thumbprint && privateKeyPem ? { clientId, tenantId, credential: { kind: 'certificate', privateKeyPem, thumbprint } } : null;
  }
}
