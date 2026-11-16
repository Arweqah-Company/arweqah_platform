import { Injectable } from '@nestjs/common';
import type { AgentAction } from '../../domain/types/agent-catalog.types';

/** What the executor needs from the request that asked: the person's own session and where the API listens. */
export interface AgentRequestContext {
  cookie: string;
  ip: string | null;
  /** The port the API itself listens on (read from the incoming connection). */
  port: number;
  locale: 'ar' | 'en';
}

export interface AgentCallResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface AgentCallInput {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
}

const TIMEOUT_MS = 20_000;

/**
 * Runs a route of this same API with the employee's own session (FR-141): every guard, zod pipe, scope check and audit entry
 * works as if the person had pressed the button. There is no direct call to a service, so there is no way around a permission.
 */
@Injectable()
export class AgentExecutor {
  async run(action: AgentAction, input: AgentCallInput, request: AgentRequestContext): Promise<AgentCallResult> {
    const hasBody = action.httpMethod !== 'GET' && action.httpMethod !== 'DELETE';
    try {
      const response = await fetch(this.urlOf(action, input, request.port), {
        method: action.httpMethod,
        headers: this.headers(request, hasBody),
        body: hasBody ? JSON.stringify(input.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return { ok: response.ok, status: response.status, body: await this.read(response) };
    } catch {
      return { ok: false, status: 0, body: { message: 'The request could not be made' } };
    }
  }

  private urlOf(action: AgentAction, input: AgentCallInput, port: number): string {
    const path = action.path.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(String(input.path[name] ?? '')));
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(input.query)) for (const one of [value].flat()) query.append(name, String(one));
    const suffix = query.size ? `?${query.toString()}` : '';
    return `http://127.0.0.1:${port}/api${path}${suffix}`;
  }

  private headers(request: AgentRequestContext, hasBody: boolean): Record<string, string> {
    return {
      cookie: request.cookie,
      accept: 'application/json',
      'accept-language': request.locale,
      ...(request.ip ? { 'x-forwarded-for': request.ip } : {}),
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
    };
  }

  private async read(response: Response): Promise<unknown> {
    const text = await response.text();
    try {
      return text ? (JSON.parse(text) as unknown) : null;
    } catch {
      return { message: text.slice(0, 300) };
    }
  }
}

/** The route's own words for a failure (its message, or its code), short. */
export function failureOf(result: AgentCallResult): string {
  const body = result.body as { message?: unknown; code?: unknown } | null;
  const text = typeof body?.message === 'string' ? body.message : typeof body?.code === 'string' ? body.code : `HTTP ${result.status}`;
  return text.slice(0, 300);
}
