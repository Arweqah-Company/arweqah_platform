import type { FileDto } from '@arweqah-platform/shared';
import { vi } from 'vitest';
import { apiClient } from '@/core/api/api-client';

/**
 * Makes every file upload (`POST /files`) wait until `release()`, then answer with the next file of `stored`. A slow answer cannot be made in MSW: jsdom's form body
 * is refused by the network layer when the handler is slow (content-length mismatch), so the upload would fail instead of waiting. Other calls go on as they are.
 */
export function slowUploads(stored: FileDto[]) {
  const real = apiClient.post.bind(apiClient);
  const queue = [...stored];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  vi.spyOn(apiClient, 'post').mockImplementation(((path: string, body?: unknown) => (path === '/files' ? gate.then(() => queue.shift()) : real(path, body))) as typeof apiClient.post);
  return { release };
}
