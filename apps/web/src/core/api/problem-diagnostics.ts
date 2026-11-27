/**
 * What a problem report says about the screen: the last failed calls to the platform (method, path and status, never a body or a query) and the last errors the
 * screen raised, kept in memory only. Nothing leaves the browser until the person sends a report.
 */
const LIMIT = 5;

export interface FailedRequest {
  method: string;
  path: string;
  status: number;
}

const failedRequests: FailedRequest[] = [];
const errors: string[] = [];

function push<T>(list: T[], item: T): void {
  list.push(item);
  if (list.length > LIMIT) list.shift();
}

/** A call that failed (`status` 0 = it never got an answer). The query string is dropped: it may hold what the person searched for. */
export function recordFailedRequest(method: string, path: string, status: number): void {
  push(failedRequests, { method, path: path.split('?')[0]!.slice(0, 200), status });
}

export function recordScreenError(text: string): void {
  push(errors, text.slice(0, 300));
}

export function diagnosticsSnapshot(): { failedRequests: FailedRequest[]; errors: string[] } {
  return { failedRequests: [...failedRequests], errors: [...errors] };
}

export function resetDiagnostics(): void {
  failedRequests.length = 0;
  errors.length = 0;
}

let installed = false;

/** Listens once for the errors the screen raises. */
export function installScreenErrorListeners(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => recordScreenError(event.message || 'Error'));
  window.addEventListener('unhandledrejection', (event) => recordScreenError(`Unhandled: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}`));
}

installScreenErrorListeners();
