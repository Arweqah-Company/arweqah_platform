import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';

export class AgentConversationNotFoundError extends NotFoundError {
  constructor() {
    super('Conversation');
  }
}

export class AgentDraftNotFoundError extends NotFoundError {
  constructor() {
    super('Draft');
  }
}

/** Already confirmed, cancelled or failed: a draft runs once. */
export class AgentDraftNotPendingError extends ConflictError {
  override readonly code = 'AGENT_DRAFT_NOT_PENDING';
  constructor() {
    super('This request was already handled');
  }
}

export class AgentDraftExpiredError extends ConflictError {
  override readonly code = 'AGENT_DRAFT_EXPIRED';
  constructor() {
    super('This request expired, ask the assistant again');
  }
}

export class AgentRateLimitedError extends BusinessRuleError {
  override readonly code = 'AGENT_RATE_LIMITED';
  constructor() {
    super('Too many messages this hour, try again later');
  }
}

/** The administrator switched the assistant off in the security settings. */
export class AgentDisabledError extends ForbiddenError {
  override readonly code = 'AGENT_DISABLED';
  constructor() {
    super('The platform assistant is switched off');
  }
}

/** The form the employee sent has mistakes: `details.fields` names each field and what is wrong. */
export class AgentFormInvalidError extends BusinessRuleError {
  override readonly code = 'AGENT_FORM_INVALID';
  constructor(fields: Record<string, string>) {
    super('The form has mistakes', { fields });
  }
}

/** The sound sent for transcription is not a 16-bit WAV, or is longer or bigger than the limits. */
export class AgentAudioInvalidError extends BusinessRuleError {
  override readonly code = 'AGENT_AUDIO_INVALID';
  constructor() {
    super('The recording must be a WAV of at most 5 minutes and 10 MB');
  }
}

/** A picture the employee ticked is not one the card offered, or one sent with a message is not theirs to send. */
export class AgentDraftFileError extends BusinessRuleError {
  override readonly code = 'AGENT_DRAFT_FILE';
  constructor() {
    super('Those pictures cannot go with this request');
  }
}
