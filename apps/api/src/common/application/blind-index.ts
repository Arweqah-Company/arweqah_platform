import { createHmac } from 'node:crypto';

/**
 * Keyed hash (HMAC-SHA256) of a sensitive value, so an encrypted column can still be searched by
 * exact match and kept unique. The key is separate from the encryption key; the hash is not reversible.
 */
export class BlindIndex {
  constructor(private readonly key: string) {}

  of(value: string): string {
    return createHmac('sha256', this.key).update(value.trim().toUpperCase().replace(/\s+/g, '')).digest('hex');
  }
}
