import type { AgentFileDto } from '@arweqah-platform/shared';

/** A picture of the chat. Right after it is sent it also carries `localUrl`, the preview made from the file the person chose, so it shows while the server works. */
export type ChatFile = AgentFileDto & { localUrl?: string };
