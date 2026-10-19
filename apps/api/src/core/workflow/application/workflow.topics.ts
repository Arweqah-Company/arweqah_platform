/** Published after every committed transition; features subscribe to react (notify, update records). */
export const WORKFLOW_TRANSITIONED = 'workflow.transitioned';
/** Internal: a state timeout became due. */
export const WORKFLOW_TIMEOUT = 'workflow.timeout';

export interface WorkflowTransitionedPayload {
  instanceId: string;
  definitionKey: string;
  entityType: string;
  entityId: string;
  event: string;
  from: string;
  to: string;
  isDone: boolean;
  actorId: string | null;
  [key: string]: unknown;
}
