import { Injectable } from '@nestjs/common';
import { SecuritySettingsService } from '../../../auth/application/security-settings.service';
import { AgentDisabledError } from '../../domain/errors/agent.errors';

/** Whether the administrator has the assistant on (the checkbox in the security settings); every use of it asks first. */
@Injectable()
export class AgentAvailability {
  constructor(private readonly settings: SecuritySettingsService) {}

  async assertOn(): Promise<void> {
    if ((await this.settings.get('agentEnabled')) !== 1) throw new AgentDisabledError();
  }
}
