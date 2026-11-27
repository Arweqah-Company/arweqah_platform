import { MAX_UPLOAD_BYTES } from '@arweqah-platform/shared';
import { useMe } from '@/core/auth/session';

/** The largest attachment in bytes, as the administrator set it (Settings → Security → Attachments); every file box shows and checks this one number. */
export function useMaxUploadBytes(): number {
  const { data } = useMe();
  return data ? data.maxUploadMb * 1024 * 1024 : MAX_UPLOAD_BYTES;
}
