/**
 * The outside services the platform can use (translation, e-mail, bot protection, AI), and the data each one needs. One description
 * drives the API (what is required, what is secret, what is valid) and the web (which fields the form shows), so a
 * provider is added here once. Secrets are stored encrypted and never sent back to the browser.
 */
export const INTEGRATION_KINDS = ['translation', 'email', 'captcha', 'ai'] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export const TRANSLATION_PROVIDERS = ['aws', 'google', 'azure'] as const;
export const EMAIL_PROVIDERS = ['smtp', 'ses', 'sendgrid', 'graph'] as const;
export const CAPTCHA_PROVIDERS = ['turnstile'] as const;
export const AI_PROVIDERS = ['anthropic', 'compatible'] as const;
export const PROVIDERS_OF = { translation: TRANSLATION_PROVIDERS, email: EMAIL_PROVIDERS, captcha: CAPTCHA_PROVIDERS, ai: AI_PROVIDERS } as const;
/** The model used until the administrator picks another one in the AI settings. */
export const AI_DEFAULT_MODEL = 'claude-opus-5-5';
/** The free option out of the box: Google Gemini's OpenAI-compatible address and one of its free-tier models (Google's pricing page, 2026-11-09). */
export const COMPATIBLE_DEFAULT_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const COMPATIBLE_DEFAULT_MODEL = 'gemini-3.8-flash';
export type TranslationProviderKey = (typeof TRANSLATION_PROVIDERS)[number];
export type EmailProviderKey = (typeof EMAIL_PROVIDERS)[number];
export type CaptchaProviderKey = (typeof CAPTCHA_PROVIDERS)[number];
export type AiProviderKey = (typeof AI_PROVIDERS)[number];
export type ProviderKey = TranslationProviderKey | EmailProviderKey | CaptchaProviderKey | AiProviderKey;

/** How a value is checked beyond "not empty". */
export type FieldFormat = 'sender' | 'email' | 'url' | 'public-url' | 'service-account-json';

export interface ProviderField {
  key: string;
  type: 'text' | 'password' | 'textarea' | 'number' | 'boolean';
  required: boolean;
  /** Stored encrypted, shown as "saved", never returned by the API. */
  secret?: boolean;
  format?: FieldFormat;
  defaultValue?: string | number | boolean;
}

export type ProviderValue = string | number | boolean;
export type ProviderValues = Record<string, ProviderValue>;

const text = (key: string, extra: Partial<ProviderField> = {}): ProviderField => ({ key, type: 'text', required: true, ...extra });
const secret = (key: string, extra: Partial<ProviderField> = {}): ProviderField => ({ key, type: 'password', required: true, secret: true, ...extra });
const sender = (key = 'from'): ProviderField => text(key, { format: 'sender' });

export const PROVIDER_FIELDS: Record<ProviderKey, ProviderField[]> = {
  aws: [text('accessKeyId'), secret('secretAccessKey'), text('region', { defaultValue: 'us-east-1' })],
  google: [{ key: 'serviceAccountJson', type: 'textarea', required: true, secret: true, format: 'service-account-json' }],
  azure: [secret('key'), text('region'), text('endpoint', { format: 'url', defaultValue: 'https://api.cognitive.microsofttranslator.com' })],
  smtp: [
    text('host'),
    { key: 'port', type: 'number', required: true, defaultValue: 587 },
    { key: 'secure', type: 'boolean', required: false, defaultValue: false },
    text('user', { required: false }),
    secret('password', { required: false }),
    sender(),
  ],
  ses: [text('accessKeyId'), secret('secretAccessKey'), text('region', { defaultValue: 'me-south-1' }), sender()],
  sendgrid: [secret('apiKey'), sender()],
  // The site key is public (the sign-in page needs it); the secret key never leaves the server.
  turnstile: [text('siteKey'), secret('secretKey')],
  // The model is a name the administrator can change (a cheaper one, a newer one); the key never leaves the server.
  anthropic: [secret('apiKey'), text('model', { defaultValue: AI_DEFAULT_MODEL })],
  // Any service that speaks the OpenAI `chat/completions` protocol (Gemini's free tier, Groq, OpenRouter…): its address, its key and a model it offers.
  compatible: [secret('apiKey'), text('baseUrl', { format: 'public-url', defaultValue: COMPATIBLE_DEFAULT_URL }), text('model', { defaultValue: COMPATIBLE_DEFAULT_MODEL })],
  graph: [text('tenantId'), text('clientId'), secret('clientSecret'), text('sender', { format: 'email' })],
};

export function isProviderOf(kind: IntegrationKind, key: string): key is ProviderKey {
  return (PROVIDERS_OF[kind] as readonly string[]).includes(key);
}

const SENDER = /^([^<>@]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)$/;
const EMAIL = /^[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+$/;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** A host given by number (a dotted or whole number, an IPv6 literal): it would reach the internal network or the cloud metadata address. */
function isNumericHost(host: string): boolean {
  return host.includes(':') || host.startsWith('[') || host.split('.').every((part) => part !== '' && /^\d+$/.test(part));
}

/** A name that only means something inside a network. */
function isLocalHost(host: string): boolean {
  return host === 'localhost' || !host.includes('.') || ['.localhost', '.local', '.internal'].some((suffix) => host.endsWith(suffix));
}

/** An address the server may call on an administrator's word: https, a public name, and no credentials in it. */
function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    // `localhost.` and `127.0.0.1.` are the same names with a root dot: look at them without it.
    const host = url.hostname.toLowerCase().replace(/\.+$/, '');
    return url.protocol === 'https:' && !url.username && !url.password && !isNumericHost(host) && !isLocalHost(host);
  } catch {
    return false;
  }
}

function serviceAccountProblem(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string';
  } catch {
    return true;
  }
}

function formatProblem(format: FieldFormat, value: string): boolean {
  switch (format) {
    case 'sender':
      return !SENDER.test(value.trim());
    case 'email':
      return !EMAIL.test(value.trim());
    case 'url':
      return !isHttpsUrl(value.trim());
    case 'public-url':
      return !isPublicHttpsUrl(value.trim());
    case 'service-account-json':
      return serviceAccountProblem(value);
  }
}

const isBlank = (value: ProviderValue | undefined): boolean => value === undefined || (typeof value === 'string' && value.trim() === '');

function typeProblem(field: ProviderField, value: ProviderValue): boolean {
  if (field.type === 'number') return !(typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 65536);
  if (field.type === 'boolean') return typeof value !== 'boolean';
  return !!field.format && typeof value === 'string' && formatProblem(field.format, value);
}

/** `required` when the value is missing, `invalid` when it is filled but wrong, null when it is fine. */
export function providerFieldError(field: ProviderField, value: ProviderValue | undefined): 'required' | 'invalid' | null {
  if (value === undefined || isBlank(value)) return field.required ? 'required' : null;
  return typeProblem(field, value) ? 'invalid' : null;
}

/** Fields still to fill, and fields filled wrongly, in the order of the form. */
export function providerProblems(providerKey: ProviderKey, values: ProviderValues): { missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const field of PROVIDER_FIELDS[providerKey]) {
    const problem = providerFieldError(field, values[field.key]);
    if (problem === 'required') missing.push(field.key);
    if (problem === 'invalid') invalid.push(field.key);
  }
  return { missing, invalid };
}
