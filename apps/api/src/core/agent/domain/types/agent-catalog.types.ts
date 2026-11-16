/** Metadata key set by `@AgentHidden()`; read by the catalog (kept in the domain so the decorator and the reader share it). */
export const AGENT_HIDDEN = 'agent_hidden';
/** Metadata key set by `@AgentHint()`: a sentence for the model about how to use the route. */
export const AGENT_HINT = 'agent_hint';

export type AgentHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** `write` = a route that changes data (becomes a proposable action); `read` = a GET the assistant may use to look data up. */
export type AgentActionKind = 'write' | 'read';

/** Where a field travels in the request. */
export type AgentFieldPlace = 'path' | 'query' | 'body';

export interface AgentField {
  name: string;
  place: AgentFieldPlace;
  /** Mandatory fields are asked for, never guessed (FR-139). */
  required: boolean;
  /** JSON Schema of the value, taken from the route's zod schema. */
  schema: Record<string, unknown>;
}

/** One route the assistant may use, built from the controllers (FR-135). */
export interface AgentAction {
  /** `ControllerName.method`: stable, and the only handle a draft stores (the route is looked up again from it). */
  operationId: string;
  kind: AgentActionKind;
  httpMethod: AgentHttpMethod;
  /** Route path without the global `/api` prefix, with `:param` placeholders. */
  path: string;
  permission: string;
  /** The page whose hiding also hides this action (`@HiddenWithPage`), if any. */
  pageKey: string | null;
  labelAr: string;
  labelEn: string;
  /** What the route's owner says the model should know before using it (`@AgentHint`), or null. */
  hint: string | null;
  fields: AgentField[];
}

export type AgentExclusionReason =
  | 'no-permission'
  | 'admin-mode'
  | 'before-mfa'
  | 'upload'
  | 'import'
  | 'sensitive-area'
  | 'hidden'
  | 'unsupported-schema';

export interface AgentExcludedRoute {
  operationId: string;
  reason: AgentExclusionReason;
  /** The key and names of the action when the route carries one (so the assistant can tell an employee that it exists and why the chat cannot do it). */
  permission: string | null;
  labelAr: string | null;
  labelEn: string | null;
}

/** Everything the rules need to know about one route, read from its metadata. */
export interface AgentRouteFacts {
  operationId: string;
  httpMethod: AgentHttpMethod;
  path: string;
  permission: string | null;
  adminMode: boolean;
  allowBeforeMfa: boolean;
  agentHidden: boolean;
  upload: boolean;
  unsupportedSchema: boolean;
}
