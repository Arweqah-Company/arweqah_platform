import { Injectable, Logger } from '@nestjs/common';
import { SmsSender } from '../application/notification-channel';

/**
 * Placeholder until the Saudi SMS provider is chosen: logs a masked number only.
 * Replace by adding a provider adapter that extends SmsSender.
 */
@Injectable()
export class LogSmsSender extends SmsSender {
  private readonly logger = new Logger('Sms');

  async send(sms: { to: string; text: string }): Promise<void> {
    this.logger.log(`SMS to ***${sms.to.slice(-4)} (${sms.text.length} chars)`);
  }
}
