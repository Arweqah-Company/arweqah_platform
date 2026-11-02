import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { returnedRows } from '../../../common/infrastructure/query-result';
import { DeviceSecurityRepository, type SessionRow, type TrustedDeviceRow } from '../domain/device-security.repository';

interface RawSession { id: string; user_agent: string | null; ip_address: string | null; created_at: Date; updated_at: Date }
interface RawDevice { id: string; label: string; created_at: Date; last_used_at: Date | null; expires_at: Date; token_hash: string }
const device = (r: RawDevice): TrustedDeviceRow & { tokenHash: string } => ({ id: r.id, label: r.label, createdAt: r.created_at, lastUsedAt: r.last_used_at, expiresAt: r.expires_at, tokenHash: r.token_hash });

@Injectable()
export class TypeOrmDeviceSecurityRepository extends DeviceSecurityRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async sessionsOf(userId: string, now: Date): Promise<SessionRow[]> {
    const rows: RawSession[] = await this.ds.query('SELECT id, user_agent, ip_address, created_at, updated_at FROM auth_sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY updated_at DESC', [userId, now]);
    return rows.map((r) => ({ id: r.id, userAgent: r.user_agent, ip: r.ip_address, createdAt: r.created_at, updatedAt: r.updated_at }));
  }

  async endSession(userId: string, sessionId: string): Promise<boolean> {
    return returnedRows(await this.ds.query('DELETE FROM auth_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [sessionId, userId])).length > 0;
  }

  async endOtherSessions(userId: string, keepSessionId: string): Promise<number> {
    return returnedRows(await this.ds.query('DELETE FROM auth_sessions WHERE user_id = $1 AND id <> $2 RETURNING id', [userId, keepSessionId])).length;
  }

  async addTrusted(input: { userId: string; tokenHash: string; label: string; expiresAt: Date }): Promise<string> {
    const rows: { id: string }[] = await this.ds.query('INSERT INTO trusted_devices (user_id, token_hash, label, expires_at) VALUES ($1, $2, $3, $4) RETURNING id', [input.userId, input.tokenHash, input.label, input.expiresAt]);
    return rows[0]?.id as string;
  }

  async useTrusted(userId: string, tokenHash: string, now: Date): Promise<TrustedDeviceRow | null> {
    const rows = returnedRows<RawDevice>(await this.ds.query('UPDATE trusted_devices SET last_used_at = $3 WHERE user_id = $1 AND token_hash = $2 AND expires_at > $3 RETURNING id, label, created_at, last_used_at, expires_at, token_hash', [userId, tokenHash, now]));
    return rows[0] ? device(rows[0]) : null;
  }

  async trustedOf(userId: string, now: Date): Promise<(TrustedDeviceRow & { tokenHash: string })[]> {
    const rows: RawDevice[] = await this.ds.query('SELECT id, label, created_at, last_used_at, expires_at, token_hash FROM trusted_devices WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC', [userId, now]);
    return rows.map(device);
  }

  async removeTrusted(userId: string, id: string): Promise<boolean> {
    return returnedRows(await this.ds.query('DELETE FROM trusted_devices WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).length > 0;
  }

  async removeAllTrusted(userId: string): Promise<void> {
    await this.ds.query('DELETE FROM trusted_devices WHERE user_id = $1', [userId]);
  }
}
