import type { ApiErrorBody } from '@arweqah-platform/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

/** Listeners for session-level failures (401 → sign-in, code not verified → the code step). */
type FailureListener = (error: ApiError) => void;

/**
 * The one HTTP client (Singleton). The session lives in an HttpOnly cookie,
 * so no token is ever read or stored by JavaScript.
 */
class ApiClient {
  private readonly listeners = new Set<FailureListener>();

  constructor(private readonly baseUrl: string) {}

  onFailure(listener: FailureListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await fetch(this.url(path, options.query), {
      method: options.method ?? 'GET',
      credentials: 'include',
      ...encodeBody(options.body),
    });
    if (res.status === 204) return undefined as T;
    const data: unknown = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    if (!res.ok) throw this.fail(res.status, data as Partial<ApiErrorBody> | null);
    return data as T;
  }

  /** A file's bytes (the preview window shows them from an object URL, so the API's own security headers stay as strict as they are). */
  async blob(path: string): Promise<Blob> {
    const res = await fetch(this.url(path), { credentials: 'include' });
    if (!res.ok) {
      const data: unknown = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
      throw this.fail(res.status, data as Partial<ApiErrorBody> | null);
    }
    return res.blob();
  }

  get<T>(path: string, query?: Query): Promise<T> {
    return this.request<T>(path, { query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body });
  }

  delete(path: string): Promise<void> {
    return this.request<void>(path, { method: 'DELETE' });
  }

  private url(path: string, query?: Query): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== '') params.set(k, String(v));
    const qs = params.toString();
    return `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
  }

  private fail(status: number, body: Partial<ApiErrorBody> | null): ApiError {
    const error = new ApiError(status, body?.code ?? 'ERROR', body?.message ?? 'Request failed', body?.details);
    if (status === 401 || error.code === 'MFA_REQUIRED' || error.code === 'ADMIN_MODE_REQUIRED') this.listeners.forEach((l) => l(error));
    return error;
  }
}

/** JSON by default; FormData is sent as-is so the browser sets the multipart boundary. */
function encodeBody(body: unknown): Pick<RequestInit, 'body' | 'headers'> {
  if (body === undefined) return {};
  if (body instanceof FormData) return { body };
  return { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } };
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_URL ?? '/api');
