import { ExternalServiceError } from '../../../../common/domain/domain-error';
import { MailTransport } from '../../application/mail-transport';
import type { MailReceipt, OutgoingMail } from '../../application/notification-channel';

export interface GraphSettings {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  sender: string;
}

const TIMEOUT_MS = 10_000;

/** Microsoft 365 mailbox through Microsoft Graph, signed in as the app (client credentials, Mail.Send permission). */
export class GraphMailTransport extends MailTransport {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly settings: GraphSettings) {
    super();
  }

  async send(mail: OutgoingMail): Promise<MailReceipt> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(this.settings.sender)}/sendMail`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await this.accessToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: mail.subject,
            body: mail.html ? { contentType: 'HTML', content: mail.html } : { contentType: 'Text', content: mail.text },
            toRecipients: [{ emailAddress: { address: mail.to } }],
          },
          saveToSentItems: false,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(await this.problem(response));
      return { messageId: response.headers.get('request-id'), response: `Microsoft Graph answered ${response.status}` };
    } catch (error) {
      throw new ExternalServiceError('Email delivery failed', { cause: (error as Error).message });
    }
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(this.settings.tenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.settings.clientId,
        client_secret: this.settings.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!response.ok || !body.access_token) throw new Error(body.error_description?.split('\r\n')[0] ?? `Microsoft sign-in answered ${response.status}`);
    this.token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
    return body.access_token;
  }

  private async problem(response: Response): Promise<string> {
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    return body.error?.message ?? `Microsoft Graph answered ${response.status}`;
  }
}
