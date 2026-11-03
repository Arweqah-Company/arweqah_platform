/** Signs the browser in as someone else (or back as the administrator) and answers the `Set-Cookie` headers to send. */
export abstract class SessionSwitcher {
  abstract openFor(targetUserId: string, impersonatorUserId: string, impersonatorSessionId: string): Promise<string[]>;
  abstract returnTo(adminToken: string): Promise<string[]>;
}
