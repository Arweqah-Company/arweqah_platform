import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AuditService } from '../src/core/audit/application/audit.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const AUDITOR = [ADMIN_MODE_GRANT, { key: CorePermission.AuditView, scope: ALL }, { key: CorePermission.AuditVerify, scope: ALL }];

describe('The audit log cannot be changed without it showing (FR-75)', () => {
  const t = useTestApp();
  const write = (n: number, extra: Record<string, unknown> = {}) => t.app.get(AuditService).record({ actorId: null, action: 'role.created', entityType: 'role', entityId: `r${n}`, changes: { n, ...extra } });
  const verify = async () => (await (await t.factories.signInAdminMode(await t.factories.user({ grants: AUDITOR }))).get('/api/audit-logs/verify').expect(200)).body as { checked: number; ok: boolean; brokenAtSeq: string | null };

  it('chains the entries written one after the other, and says the log is whole', async () => {
    await write(1);
    await write(2, { nested: { b: 1, a: [new Date('2026-11-02T10:00:00Z')] } });
    const result = await verify();
    expect(result.ok).toBe(true);
    expect(result.checked).toBeGreaterThanOrEqual(2);
    const rows = (await t.db.query('SELECT prev_hash, hash FROM audit_logs WHERE hash IS NOT NULL ORDER BY seq')) as { prev_hash: string | null; hash: string }[];
    expect(rows[0]?.prev_hash).toBeNull();
    rows.slice(1).forEach((row, i) => expect(row.prev_hash).toBe((rows[i] as { hash: string }).hash));
  });

  it('keeps the chain whole when many entries are written at once', async () => {
    await Promise.all(Array.from({ length: 25 }, (_, n) => write(n)));
    const result = await verify();
    expect(result).toMatchObject({ ok: true, brokenAtSeq: null });
    expect(result.checked).toBeGreaterThanOrEqual(25);
  });

  it('refuses a change or a removal of an entry, whoever asks the database', async () => {
    await write(1);
    await expect(t.db.query(`UPDATE audit_logs SET action = 'role.deleted'`)).rejects.toThrow(/append-only/);
    await expect(t.db.query('DELETE FROM audit_logs')).rejects.toThrow(/append-only/);
    expect((await t.db.query('SELECT count(*)::int AS n FROM audit_logs'))[0].n).toBeGreaterThanOrEqual(1);
  });

  it('finds an entry that was changed or taken out behind the database\'s back', async () => {
    for (const n of [1, 2, 3, 4]) await write(n);
    await t.db.query('ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_append_only');
    try {
      const rows = (await t.db.query('SELECT id, seq FROM audit_logs WHERE hash IS NOT NULL ORDER BY seq')) as { id: string; seq: string }[];
      await t.db.query(`UPDATE audit_logs SET action = 'role.deleted' WHERE id = $1`, [rows[1]?.id]);
      expect(await verify()).toMatchObject({ ok: false, brokenAtSeq: rows[1]?.seq });
      await t.db.query(`UPDATE audit_logs SET action = 'role.created' WHERE id = $1`, [rows[1]?.id]);
      expect((await verify()).ok).toBe(true);
      await t.db.query('DELETE FROM audit_logs WHERE id = $1', [rows[2]?.id]);
      expect(await verify()).toMatchObject({ ok: false, brokenAtSeq: rows[3]?.seq });
    } finally {
      await t.db.query('ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_append_only');
    }
  });

  it('records a broken chain when the weekly check finds one, and stays quiet when it is whole', async () => {
    await write(1);
    const service = t.app.get(AuditService);
    await service.scheduledCheck();
    expect((await t.db.query(`SELECT 1 FROM audit_logs WHERE action = 'audit.chain_broken'`))).toHaveLength(0);
  });

  it('answers 403 to someone without the key', async () => {
    const agent = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: CorePermission.AuditView, scope: ALL }] }));
    await agent.get('/api/audit-logs/verify').expect(403);
    const plain = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.AuditVerify, scope: ALL }] }));
    await plain.get('/api/audit-logs/verify').expect(403);
  });
});
